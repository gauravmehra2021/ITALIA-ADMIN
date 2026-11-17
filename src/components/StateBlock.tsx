import type { ReactNode } from 'react';
import { Alert, EmptyState, Spinner } from './ui';

/* Older helpers kept for pages that still use them; they render the new components. */

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <Spinner label={label} />;
}

export function Empty({ label = 'Nothing here yet.', action }: { label?: string; action?: ReactNode }) {
  return <EmptyState title={label} action={action} />;
}

export function ErrorBox({ message }: { message: string }) {
  return <Alert tone="error">{message}</Alert>;
}

export function SuccessBox({ message }: { message: string }) {
  return <Alert tone="success">{message}</Alert>;
}
