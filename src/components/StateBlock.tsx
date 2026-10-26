export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="loading">{label}</div>;
}

export function Empty({ label = 'Nothing here yet.' }: { label?: string }) {
  return <div className="empty">{label}</div>;
}

export function ErrorBox({ message }: { message: string }) {
  return <div className="error">{message}</div>;
}

export function SuccessBox({ message }: { message: string }) {
  return <div className="toast-success">{message}</div>;
}
