import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  Injector,
  NgZone,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject, Subscription, merge, timer } from 'rxjs';
import { filter } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/auth/auth.service';
import { parseReservationWsEvent } from './reservation-ws.util';

export interface ReservationWsEvent {
  type: 'CREATED' | 'STATUS_UPDATED';
  reservationId: number;
  status: string;
  conflictedIds?: number[];
  revertedIds?: number[];
  timestamp?: string;
}

/** Quiet refresh tick — safety net when WebSocket is unavailable. */
export type ReservationRefreshTick = { type: 'REFRESH' };

const POLL_MS = 4000;

@Injectable({ providedIn: 'root' })
export class ReservationRealtimeService {
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private client: Client | null = null;
  private fltStompSub: StompSubscription | null = null;
  private gymStompSub: StompSubscription | null = null;
  private vanStompSub: StompSubscription | null = null;
  private pollSub: Subscription | null = null;
  private startedSockJsFallback = false;

  private readonly fltSubject = new Subject<ReservationWsEvent>();
  private readonly gymSubject = new Subject<ReservationWsEvent>();
  private readonly vanSubject = new Subject<ReservationWsEvent>();
  private readonly refreshSubject = new Subject<ReservationRefreshTick>();

  readonly fltUpdates$: Observable<ReservationWsEvent> = this.fltSubject.asObservable();
  readonly gymUpdates$: Observable<ReservationWsEvent> = this.gymSubject.asObservable();
  readonly vanUpdates$: Observable<ReservationWsEvent> = this.vanSubject.asObservable();
  /** Always fires while a page has called ensureConnected — works even if WS fails. */
  readonly refreshTicks$: Observable<ReservationRefreshTick> = this.refreshSubject.asObservable();
  readonly anyUpdates$: Observable<ReservationWsEvent> = merge(
    this.fltUpdates$,
    this.gymUpdates$,
    this.vanUpdates$,
  );

  constructor() {
    if (!this.isBrowser) return;

    afterNextRender(() => {
      runInInjectionContext(this.injector, () => {
        effect(() => {
          const token = this.auth.token();
          if (token) {
            this.ensureConnected();
          } else {
            this.disconnect();
          }
        });
      });
    });
  }

  /** Idempotent connect — safe to call from admin pages on init. */
  ensureConnected(): void {
    if (!this.isBrowser) return;

    const token = this.auth.token();
    if (!token) return;

    this.ensurePolling();

    if (this.client?.connected || this.client?.active) return;

    this.startClient({ useSockJs: false });
  }

  disconnect(): void {
    this.clearSubscriptions();
    this.pollSub?.unsubscribe();
    this.pollSub = null;
    this.startedSockJsFallback = false;
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  private ensurePolling(): void {
    if (this.pollSub) return;

    // Visible-tab HTTP refresh so pending rows appear even when STOMP never connects.
    this.pollSub = timer(POLL_MS, POLL_MS)
      .pipe(filter(() => typeof document === 'undefined' || document.visibilityState === 'visible'))
      .subscribe(() => {
        this.zone.run(() => this.refreshSubject.next({ type: 'REFRESH' }));
      });
  }

  private startClient(opts: { useSockJs: boolean }): void {
    const token = this.auth.token();
    if (!token) return;

    this.client = new Client({
      ...(opts.useSockJs
        ? {
            webSocketFactory: () =>
              new SockJS(this.sockJsUrl(), undefined, {
                transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
              }),
          }
        : { brokerURL: this.nativeBrokerUrl() }),
      connectHeaders: { Authorization: `LpuL ${token}` },
      reconnectDelay: opts.useSockJs ? 5000 : 8000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      connectionTimeout: 8000,
      beforeConnect: (client) => {
        const nextToken = this.auth.token();
        if (nextToken) {
          client.connectHeaders = { Authorization: `LpuL ${nextToken}` };
        }
      },
      onConnect: () => {
        console.info('[reservation-ws] connected via', opts.useSockJs ? 'sockjs' : 'native');
        this.zone.run(() => this.subscribeTopics());
      },
      onDisconnect: () => {
        this.zone.run(() => this.clearSubscriptions());
      },
      onStompError: (frame) => {
        console.warn('[reservation-ws] STOMP error', frame.headers['message'], frame.body);
      },
      onWebSocketError: (event) => {
        console.warn('[reservation-ws] WebSocket error', event);
        if (!opts.useSockJs) this.trySockJsFallback();
      },
      onWebSocketClose: (event) => {
        if (!opts.useSockJs && event.code !== 1000 && !this.client?.connected) {
          this.trySockJsFallback();
        }
      },
    });

    this.client.activate();
  }

  private trySockJsFallback(): void {
    if (this.startedSockJsFallback) return;
    if (!this.auth.token()) return;
    this.startedSockJsFallback = true;

    const current = this.client;
    this.client = null;
    void current?.deactivate().finally(() => {
      if (!this.auth.token()) return;
      this.startClient({ useSockJs: true });
    });
  }

  private nativeBrokerUrl(): string {
    const base = environment.wsUrl.replace(/\/$/, '');
    if (base.startsWith('ws://') || base.startsWith('wss://')) return base;
    if (base.startsWith('http://')) return `ws://${base.slice('http://'.length)}`;
    if (base.startsWith('https://')) return `wss://${base.slice('https://'.length)}`;
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost';
    return `${protocol}//${host}${base.startsWith('/') ? base : `/${base}`}`;
  }

  private sockJsUrl(): string {
    return environment.wsUrl.replace(/\/ws\/?$/, '/ws-sockjs');
  }

  private subscribeTopics(): void {
    if (!this.client?.connected) return;

    this.clearSubscriptions();

    this.fltStompSub = this.client.subscribe('/topic/reservations/flt', (msg: IMessage) => {
      this.emit(this.fltSubject, msg);
    });
    this.gymStompSub = this.client.subscribe('/topic/reservations/gymnasium', (msg: IMessage) => {
      this.emit(this.gymSubject, msg);
    });
    this.vanStompSub = this.client.subscribe('/topic/reservations/van', (msg: IMessage) => {
      this.emit(this.vanSubject, msg);
    });
  }

  private emit(subject: Subject<ReservationWsEvent>, msg: IMessage): void {
    try {
      const event = parseReservationWsEvent(msg.body);
      this.zone.run(() => subject.next(event));
    } catch (err) {
      console.warn('[reservation-ws] Failed to parse event', err, msg.body);
    }
  }

  private clearSubscriptions(): void {
    this.fltStompSub?.unsubscribe();
    this.gymStompSub?.unsubscribe();
    this.vanStompSub?.unsubscribe();
    this.fltStompSub = null;
    this.gymStompSub = null;
    this.vanStompSub = null;
  }
}
