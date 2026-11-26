import type { Tone } from '../components/ui';
import type { ClassSession, Enquiry, EnquiryStatus } from '../types';

/* ── Admissions pipeline ────────────────────────────────────────────────── */

/** Display order (Paid comes after Enrolled). */
export const ENQUIRY_STAGES: EnquiryStatus[] = ['New', 'Contacted', 'Qualified', 'Enrolled', 'Paid', 'Closed'];

/** The server's numeric values, in case a status arrives as a number. */
const ENQUIRY_BY_NUMBER: EnquiryStatus[] = ['New', 'Contacted', 'Qualified', 'Enrolled', 'Closed', 'Paid'];

export const ENQUIRY_META: Record<EnquiryStatus, { label: string; tone: Tone; help: string }> = {
  New: { label: 'New', tone: 'blue', help: 'Not contacted yet' },
  Contacted: { label: 'Contacted', tone: 'orange', help: 'First call or message done' },
  Qualified: { label: 'Qualified', tone: 'purple', help: 'Good fit, discussing enrolment' },
  Enrolled: { label: 'Enrolled', tone: 'teal', help: 'Agreed to join, payment not received yet' },
  Paid: { label: 'Paid', tone: 'green', help: 'Payment received: the student account is made' },
  Closed: { label: 'Closed', tone: 'gray', help: 'Not going ahead' },
};

export function enquiryStatus(status: Enquiry['status']): EnquiryStatus {
  if (typeof status === 'string') return status;
  return ENQUIRY_BY_NUMBER[status] ?? 'New';
}

/* ── Live classes ───────────────────────────────────────────────────────── */

export const CLASS_STATUSES = ['Scheduled', 'Live', 'Completed', 'Cancelled'] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

export const CLASS_META: Record<ClassStatus, { tone: Tone }> = {
  Scheduled: { tone: 'blue' },
  Live: { tone: 'red' },
  Completed: { tone: 'green' },
  Cancelled: { tone: 'gray' },
};

export function classStatus(c: ClassSession): ClassStatus {
  const raw = typeof c.status === 'string' ? c.status : CLASS_STATUSES[c.status] ?? 'Scheduled';
  const s = (CLASS_STATUSES as readonly string[]).includes(raw) ? (raw as ClassStatus) : 'Scheduled';
  // A scheduled class whose time window is running now is shown as Live.
  if (s === 'Scheduled') {
    const start = new Date(c.scheduledAtUtc).getTime();
    const now = Date.now();
    if (now >= start && now <= start + c.durationMinutes * 60000) return 'Live';
  }
  return s;
}

export const isUpcoming = (c: ClassSession) => {
  const s = classStatus(c);
  return (s === 'Scheduled' || s === 'Live') && new Date(c.scheduledAtUtc).getTime() + c.durationMinutes * 60000 > Date.now();
};

/** "11:00–12:00" for a batch with a usual class time, otherwise null. */
export const batchTiming = (b?: { startTime?: string | null; endTime?: string | null } | null) =>
  b?.startTime && b?.endTime ? `${b.startTime}–${b.endTime}` : null;
