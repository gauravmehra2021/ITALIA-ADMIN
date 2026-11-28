import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { adminNotificationLink, notificationTypeName, useNotifications } from '../hooks/useNotifications';
import type { NotificationItem } from '../types';
import { Icon, type IconName } from './Icons';
import { timeAgo } from './ui';

export const NOTIFICATION_ICON: Record<string, IconName> = {
  Class: 'Video',
  Test: 'Target',
  Announcement: 'Megaphone',
  Security: 'Lock',
  Payment: 'Info',
  System: 'Info',
  Course: 'Book',
  Lesson: 'Play',
  Assignment: 'File',
  Material: 'Layers',
};

/** Header bell: live unread badge and a dropdown with the latest notifications. */
export function NotificationBell({ canOpenPage }: { canOpenPage: boolean }) {
  const { unreadCount, recent, loaded, status, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function openItem(n: NotificationItem) {
    if (!n.isRead) void markRead(n.id);
    setOpen(false);
    const to = adminNotificationLink(n) ?? (canOpenPage ? '/app/notifications' : null);
    if (to) navigate(to);
  }

  return (
    <div className="nbell" ref={ref}>
      <button
        type="button"
        className={`icon-btn ghost ${open ? 'is-active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notifications"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
      >
        <Icon.Bell size={19} />
        {unreadCount > 0 && <span className="dot-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        {status !== 'connected' && <span className={`nbell-status ${status}`} title={status === 'disconnected' ? 'Live updates offline' : 'Connecting…'} />}
      </button>

      {open && (
        <div className="nbell-panel" role="dialog" aria-label="Notifications">
          <div className="nbell-head">
            <div>
              <strong>Notifications</strong>
              <span>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</span>
            </div>
            {unreadCount > 0 && (
              <button type="button" className="link-btn" onClick={() => void markAllRead()}>
                <Icon.Check size={14} /> Mark all read
              </button>
            )}
          </div>
          {(status === 'reconnecting' || status === 'disconnected') && (
            <div className="nbell-offline"><Icon.Refresh size={13} /> Live updates paused — reconnecting…</div>
          )}
          <div className="nbell-list">
            {!loaded ? (
              <div className="nbell-empty">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="nbell-empty">
                <Icon.Bell size={22} />
                <strong>No notifications yet</strong>
              </div>
            ) : (
              recent.slice(0, 7).map((n) => {
                const I = Icon[NOTIFICATION_ICON[notificationTypeName(n.type)] ?? 'Info'];
                return (
                  <button key={n.id} type="button" className={`nbell-item ${n.isRead ? '' : 'unread'}`} onClick={() => openItem(n)}>
                    <span className="inbox-icon"><I size={15} /></span>
                    <span className="nbell-item-body">
                      <strong>{n.title}</strong>
                      <span className="nbell-msg">{n.message}</span>
                      <span className="nbell-time">{timeAgo(n.createdAtUtc)}{n.senderName ? ` · ${n.senderName}` : ''}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {canOpenPage && (
            <Link to="/app/notifications" className="nbell-foot" onClick={() => setOpen(false)}>
              Open notification centre <Icon.ArrowRight size={15} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
