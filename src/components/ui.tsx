import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icons';

/* Small shared building blocks for every console page. */

export function Logo({ size = 40, subtitle = 'Management Console', light = false, withText = true }: {
  size?: number;
  subtitle?: string;
  light?: boolean;
  withText?: boolean;
}) {
  return (
    <span className="logo">
      <img src="/images/logo-256.png" alt="SS Europa" width={size} height={size} />
      {withText && (
        <span className="logo-text">
          <strong style={{ color: light ? '#fff' : undefined }}>SS Europa</strong>
          <span style={{ color: light ? 'rgba(255,255,255,0.75)' : undefined }}>{subtitle}</span>
        </span>
      )}
    </span>
  );
}

export function PageHeader({ title, subtitle, badge, actions }: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <h1>
          {title}
          {badge}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export type Tone = 'blue' | 'green' | 'gold' | 'orange' | 'red' | 'purple' | 'teal' | 'gray';

export function StatCard({ icon, label, value, hint, tone = 'blue', to }: {
  icon: IconName;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  to?: string;
}) {
  const I = Icon[icon];
  const body = (
    <>
      <span className="stat-icon"><I size={21} /></span>
      <span className="stat-body">
        <span className="stat-value">{value}</span>
        <span className="stat-label">{label}</span>
        {hint && <span className="stat-hint">{hint}</span>}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className={`stat-card tone-${tone}`}>{body}</Link>
  ) : (
    <div className={`stat-card tone-${tone}`}>{body}</div>
  );
}

export function EmptyState({ icon = 'Inbox', title, text, action }: {
  icon?: IconName;
  title: string;
  text?: ReactNode;
  action?: ReactNode;
}) {
  const I = Icon[icon];
  return (
    <div className="empty">
      <span className="empty-icon"><I size={26} /></span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 6 }}>{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function Alert({ tone = 'info', children, onClose }: {
  tone?: 'info' | 'success' | 'error' | 'warn';
  children: ReactNode;
  onClose?: () => void;
}) {
  const I = tone === 'success' ? Icon.CheckCircle : tone === 'error' ? Icon.XCircle : tone === 'warn' ? Icon.Alert : Icon.Info;
  return (
    <div className={`alert alert-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <I size={18} />
      <div>{children}</div>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">
          <Icon.X size={16} />
        </button>
      )}
    </div>
  );
}

/** A centred dialog, or a panel sliding in from the right (drawer). Closes on Escape or backdrop click. */
export function Modal({ open, onClose, title, subtitle, children, footer, drawer = false, wide = false }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  drawer?: boolean;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={`overlay ${drawer ? 'is-drawer' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={drawer ? 'drawer' : `dialog ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="dialog-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn ghost" onClick={onClose} aria-label="Close">
            <Icon.X size={18} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
        {footer && <div className="dialog-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function initials(name?: string | null) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

export function Avatar({ name, size }: { name?: string | null; size?: 'sm' | 'lg' }) {
  return <span className={`avatar ${size ?? ''}`} aria-hidden>{initials(name)}</span>;
}

export function Person({ name, sub, size }: { name: string; sub?: ReactNode; size?: 'sm' | 'lg' }) {
  return (
    <span className="person">
      <Avatar name={name} size={size} />
      <span className="person-meta">
        <strong>{name}</strong>
        {sub && <span>{sub}</span>}
      </span>
    </span>
  );
}

/* ── Dates ──────────────────────────────────────────────────────────────── */

export function formatDate(iso?: string | null, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function timeAgo(iso?: string | null) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const future = diff < 0;
  const s = Math.abs(diff) / 1000;
  const fmt = (n: number, unit: string) => {
    const v = Math.round(n);
    return future ? `in ${v} ${unit}${v === 1 ? '' : 's'}` : `${v} ${unit}${v === 1 ? '' : 's'} ago`;
  };
  if (s < 60) return future ? 'in a moment' : 'just now';
  if (s < 3600) return fmt(s / 60, 'min');
  if (s < 86400) return fmt(s / 3600, 'hour');
  if (s < 86400 * 7) return fmt(s / 86400, 'day');
  return formatDate(iso);
}
