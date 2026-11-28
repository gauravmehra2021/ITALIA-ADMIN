import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
  type IRetryPolicy,
  type RetryContext,
} from '@microsoft/signalr';
import { API_BASE } from './api';
import type { NotificationItem } from '../types';

/**
 * Live notifications from the API's SignalR hub (/hubs/notifications).
 * Notifications are saved on the server first; this connection only makes them appear instantly.
 * After every (re)connect the panel reloads the unread count, so nothing missed while offline is lost.
 */

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface RealtimeHandlers {
  onNotification: (n: NotificationItem) => void;
  onUnreadCount: (count: number) => void;
  onConnected: () => void;
  onStatus: (status: RealtimeStatus) => void;
}

const retryForever: IRetryPolicy = {
  nextRetryDelayInMilliseconds: (ctx: RetryContext) => [0, 2000, 5000, 10000][ctx.previousRetryCount] ?? 30000,
};

const getToken = () => {
  try {
    return localStorage.getItem('sseuropa_token');
  } catch {
    return null;
  }
};

export class NotificationsRealtime {
  private connection: HubConnection | null = null;
  private stopped = false;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly handlers: RealtimeHandlers;

  constructor(handlers: RealtimeHandlers) {
    this.handlers = handlers;
  }

  start() {
    this.stopped = false;
    this.connection ??= this.build();
    void this.connect();
    window.addEventListener('online', this.onOnline);
  }

  async stop() {
    this.stopped = true;
    window.removeEventListener('online', this.onOnline);
    if (this.restartTimer) clearTimeout(this.restartTimer);
    const c = this.connection;
    this.connection = null;
    if (c) await c.stop().catch(() => undefined);
  }

  private build() {
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/notifications`, {
        accessTokenFactory: () => getToken() ?? '',
        withCredentials: false,
      })
      .withAutomaticReconnect(retryForever)
      .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
      .build();

    connection.on('notificationReceived', (n: NotificationItem) => this.handlers.onNotification(n));
    connection.on('unreadCountChanged', (c: { unreadCount: number }) => this.handlers.onUnreadCount(c.unreadCount));
    connection.onreconnecting(() => this.handlers.onStatus('reconnecting'));
    connection.onreconnected(() => {
      this.handlers.onStatus('connected');
      this.handlers.onConnected();
    });
    connection.onclose(() => {
      this.handlers.onStatus('disconnected');
      this.scheduleRestart(15000);
    });
    return connection;
  }

  private async connect() {
    const c = this.connection;
    if (!c || this.stopped || c.state !== HubConnectionState.Disconnected || !getToken()) return;
    this.handlers.onStatus('connecting');
    try {
      await c.start();
      this.handlers.onStatus('connected');
      this.handlers.onConnected();
    } catch {
      this.handlers.onStatus('disconnected');
      this.scheduleRestart(10000);
    }
  }

  private scheduleRestart(ms: number) {
    if (this.stopped) return;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    this.restartTimer = setTimeout(() => void this.connect(), ms);
  }

  private onOnline = () => {
    if (this.restartTimer) clearTimeout(this.restartTimer);
    void this.connect();
  };
}
