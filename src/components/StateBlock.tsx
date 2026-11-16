import type { ReactNode } from 'react';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="loading">{label}</div>;
}

export function Empty({ label = 'Nothing here yet.', action }: { label?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <p>{label}</p>
      {action && <div style={{ marginTop: '0.75rem' }}>{action}</div>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="error">{message}</div>;
}

export function SuccessBox({ message }: { message: string }) {
  return <div className="toast-success">{message}</div>;
}
