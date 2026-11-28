import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { notificationsApi } from '../services/platformApi';
import { NotificationsRealtime, type RealtimeStatus } from '../services/realtime';
import type { NotificationItem } from '../types';
import { useAuth } from './useAuth';

/** A change that open lists (bell dropdown, inbox) apply to what they show. */
export type NotificationEvent =
  | { kind: 'new'; notification: NotificationItem }
  | { kind: 'read'; id: string }
  | { kind: 'readAll' }
  | { kind: 'removed'; id: string }
  | { kind: 'resync' };

export function applyEvent(list: NotificationItem[], e: NotificationEvent): NotificationItem[] {
  switch (e.kind) {
    case 'new':
      return list.some((n) => n.id === e.notification.id) ? list : [e.notification, ...list];
    case 'read':
      return list.map((n) => (n.id === e.id ? { ...n, isRead: true } : n));
    case 'readAll':
      return list.map((n) => ({ ...n, isRead: true }));
    case 'removed':
      return list.filter((n) => n.id !== e.id);
    default:
      return list;
  }
}

interface NotificationsState {
  unreadCount: number;
  recent: NotificationItem[];
  loaded: boolean;
  status: RealtimeStatus;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  subscribe: (listener: (e: NotificationEvent) => void) => () => void;
}

const Ctx = createContext<NotificationsState | undefined>(undefined);

/** The signed-in team member's own notifications, kept live over SignalR. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<NotificationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const listeners = useRef(new Set<(e: NotificationEvent) => void>());

  const emit = useCallback((e: NotificationEvent) => {
    setRecent((list) => applyEvent(list, e));
    listeners.current.forEach((l) => l(e));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([notificationsApi.list(), notificationsApi.unreadCount()]);
      setRecent(list);
      setUnreadCount(count.unreadCount);
      setLoaded(true);
    } catch {
      /* offline or signed out: keep what is shown */
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const rt = new NotificationsRealtime({
      onNotification: (n) => {
        emit({ kind: 'new', notification: n });
        if (!n.isRead) setUnreadCount((c) => c + 1);
      },
      onUnreadCount: setUnreadCount,
      onConnected: () => {
        void refresh();
        listeners.current.forEach((l) => l({ kind: 'resync' }));
      },
      onStatus: setStatus,
    });
    rt.start();
    void refresh();
    return () => {
      void rt.stop();
    };
  }, [token, emit, refresh]);

  const markRead = useCallback(async (id: string) => {
    emit({ kind: 'read', id });
    try {
      setUnreadCount((await notificationsApi.markRead(id)).unreadCount);
    } catch {
      void refresh();
    }
  }, [emit, refresh]);

  const markAllRead = useCallback(async () => {
    emit({ kind: 'readAll' });
    setUnreadCount(0);
    try {
      setUnreadCount((await notificationsApi.markAllRead()).unreadCount);
    } catch {
      void refresh();
    }
  }, [emit, refresh]);

  const remove = useCallback(async (id: string) => {
    emit({ kind: 'removed', id });
    try {
      setUnreadCount((await notificationsApi.remove(id)).unreadCount);
    } catch {
      void refresh();
    }
  }, [emit, refresh]);

  const subscribe = useCallback((listener: (e: NotificationEvent) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(
    () => ({ unreadCount, recent, loaded, status, markRead, markAllRead, remove, refresh, subscribe }),
    [unreadCount, recent, loaded, status, markRead, markAllRead, remove, refresh, subscribe],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
}

const TYPE_NAMES = ['Class', 'Payment', 'Test', 'Announcement', 'Security', 'System', 'Course', 'Lesson', 'Assignment', 'Material'];
export const notificationTypeName = (t: NotificationItem['type']) => (typeof t === 'string' ? t : TYPE_NAMES[t] ?? 'System');

/** Where a notification leads inside the admin panel (null: nowhere particular). */
export function adminNotificationLink(n: NotificationItem): string | null {
  if (n.relatedEntityType === 'Class' || notificationTypeName(n.type) === 'Class') return '/app/classes';
  if (n.relatedEntityType === 'Lesson' && n.courseId && n.relatedEntityId) return `/app/courses/${n.courseId}/lessons/${n.relatedEntityId}`;
  if (n.courseId) return `/app/courses/${n.courseId}`;
  return null;
}
