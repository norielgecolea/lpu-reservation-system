import { isPlatformBrowser } from '@angular/common';
import {
  Injectable,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  effect,
  inject,
  runInInjectionContext,
} from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Observable, Subject } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class ReservationRealtimeService {
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private client: Client | null = null;
  private fltStompSub: StompSubscription | null = null;
  private gymStompSub: StompSubscription | null = null;
  private vanStompSub: StompSubscription | null = null;

  private readonly fltSubject = new Subject<ReservationWsEvent>();
  private readonly gymSubject = new Subject<ReservationWsEvent>();
  private readonly vanSubject = new Subject<ReservationWsEvent>();

  readonly fltUpdates$: Observable<ReservationWsEvent> = this.fltSubject.asObservable();
  readonly gymUpdates$: Observable<ReservationWsEvent> = this.gymSubject.asObservable();
  readonly vanUpdates$: Observable<ReservationWsEvent> = this.vanSubject.asObservable();

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
    if (this.client?.connected) return;
    if (this.client?.active) return;

    this.startClient();
  }

  disconnect(): void {
    this.clearSubscriptions();
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  private startClient(): void {
    this.client = new Client({
      webSocketFactory: () =>
        new SockJS(environment.wsUrl, undefined, {
          transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
        }),
      connectHeaders: { Authorization: `LpuL ${this.auth.token()}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      beforeConnect: (client) => {
        const token = this.auth.token();
        if (token) {
          client.connectHeaders = { Authorization: `LpuL ${token}` };
        }
      },
      onConnect: () => this.subscribeTopics(),
      onDisconnect: () => this.clearSubscriptions(),
    });

    this.client.activate();
  }

  private subscribeTopics(): void {
    if (!this.client?.connected) return;

    this.clearSubscriptions();

    this.fltStompSub = this.client.subscribe('/topic/reservations/flt', (msg: IMessage) => {
      this.fltSubject.next(parseReservationWsEvent(msg.body));
    });
    this.gymStompSub = this.client.subscribe('/topic/reservations/gymnasium', (msg: IMessage) => {
      this.gymSubject.next(parseReservationWsEvent(msg.body));
    });
    this.vanStompSub = this.client.subscribe('/topic/reservations/van', (msg: IMessage) => {
      this.vanSubject.next(parseReservationWsEvent(msg.body));
    });
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
