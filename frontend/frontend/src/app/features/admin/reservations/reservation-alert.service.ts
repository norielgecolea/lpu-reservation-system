import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { isFltTech } from '../../../core/auth/roles';

export type ReservationAlertFacility = 'FLT' | 'GYMNASIUM' | 'VAN' | 'NEXUS';

export interface ReservationAlert {
  id: number;
  facility: ReservationAlertFacility;
  count: number;
  message: string;
  createdAt: number;
}

interface PendingRow {
  id: number;
  status: string;
}

const FACILITY_LABEL: Record<ReservationAlertFacility, string> = {
  FLT: 'FLT',
  GYMNASIUM: 'Gymnasium',
  VAN: 'Van',
  NEXUS: 'Nexus Room',
};

@Injectable({ providedIn: 'root' })
export class ReservationAlertService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly auth = inject(AuthService);
  private readonly knownPending = new Map<ReservationAlertFacility, Set<number>>();
  private audioCtx: AudioContext | null = null;
  private alertSeq = 0;
  private permissionAsked = false;

  /** Newest alert shown in the balloon (null when dismissed). */
  readonly alert = signal<ReservationAlert | null>(null);

  /**
   * Seed / diff pending IDs after a list fetch.
   * First call for a facility only seeds (no alert). Later calls alert on new PENDING ids.
   */
  watchPending(facility: ReservationAlertFacility, rows: PendingRow[]): void {
    if (!this.isBrowser) return;

    const pendingIds = rows
      .filter(r => r.status === 'PENDING' && Number.isFinite(r.id))
      .map(r => r.id);

    const known = this.knownPending.get(facility);
    if (!known) {
      this.knownPending.set(facility, new Set(pendingIds));
      return;
    }

    const newcomers = pendingIds.filter(id => !known.has(id));
    for (const id of pendingIds) known.add(id);

    // FLT Tech does not work pending queues — skip sound/balloon for new PENDING.
    if (isFltTech(this.auth.user()?.role)) return;

    if (newcomers.length > 0) {
      this.notify(facility, newcomers.length);
    }
  }

  /** Immediate alert (e.g. WS CREATED) before the list reload finishes. */
  notifyCreated(facility: ReservationAlertFacility): void {
    this.notify(facility, 1);
  }

  dismiss(): void {
    this.alert.set(null);
  }

  /** Unlock audio on first user gesture so later alerts can play without a gesture. */
  unlockAudio(): void {
    if (!this.isBrowser) return;
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    this.ensureBrowserPermission();
  }

  private notify(facility: ReservationAlertFacility, count: number): void {
    if (!this.isBrowser || count < 1) return;

    const label = FACILITY_LABEL[facility];
    const message =
      count === 1
        ? `New ${label} reservation pending approval`
        : `${count} new ${label} reservations pending approval`;

    this.alertSeq += 1;
    this.alert.set({
      id: this.alertSeq,
      facility,
      count,
      message,
      createdAt: Date.now(),
    });

    this.playChime();
    this.showBrowserNotification(label, message);
  }

  private ensureBrowserPermission(): void {
    if (!this.isBrowser || this.permissionAsked) return;
    if (!('Notification' in window)) return;
    this.permissionAsked = true;
    if (Notification.permission === 'default') {
      void Notification.requestPermission();
    }
  }

  private showBrowserNotification(title: string, body: string): void {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
      this.ensureBrowserPermission();
      return;
    }
    try {
      const n = new Notification(`${title} reservation`, {
        body,
        tag: `lpu-reservation-${title}`,
      });
      window.setTimeout(() => n.close(), 8000);
    } catch {
      // Ignore — private mode / unsupported options
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
    return this.audioCtx;
  }

  private playChime(): void {
    try {
      const ctx = this.getAudioContext();
      const play = () => {
        const now = ctx.currentTime;
        this.tone(ctx, now, 880, 0.12, 0.04);
        this.tone(ctx, now + 0.12, 1174.7, 0.16, 0.05);
      };
      if (ctx.state === 'suspended') {
        void ctx.resume().then(play);
      } else {
        play();
      }
    } catch {
      // Autoplay policies / missing AudioContext
    }
  }

  private tone(
    ctx: AudioContext,
    start: number,
    freq: number,
    duration: number,
    gainValue: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}
