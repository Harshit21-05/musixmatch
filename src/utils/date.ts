/**
 * Utility functions for Indian Standard Time (IST) formatting, date parsing, and countdowns
 */

/**
 * Parses any incoming date string into an ISO timestamptz string (UTC ISO 8601).
 * Rules:
 * - Accept ISO 8601 with offsets (e.g. 'Z', '+05:30', '-04:00')
 * - Never treat 'Z' as IST (preserve UTC point-in-time)
 * - Assume IST (+05:30) ONLY when NO offset is specified
 */
export function parseToTimestamptz(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Check if timezone offset is explicitly provided:
  // e.g. ends with 'Z' or has [+-]\d\d:\d\d or [+-]\d\d\d\d
  const hasExplicitOffset = /Z$/i.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed);

  if (hasExplicitOffset) {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  // No offset given: assume IST (+05:30)
  const normalized = trimmed.replace(' ', 'T');
  const withISTOffset = normalized.includes('T')
    ? `${normalized}+05:30`
    : `${normalized}T00:00:00+05:30`;

  const d = new Date(withISTOffset);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Formats a timestamptz into localized IST readable string
 * e.g. "1 Nov, 10:00 AM IST"
 */
export function formatIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'TBA';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'TBA';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d) + ' IST';
}

/**
 * Returns a human-friendly relative time in IST
 * e.g. "in 2h 15m", "45m ago", "just now", "tomorrow"
 */
export function formatRelativeIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Unscheduled';
  const target = new Date(dateInput).getTime();
  if (isNaN(target)) return 'Unscheduled';

  const now = Date.now();
  const diff = target - now;
  const isFuture = diff > 0;
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return isFuture ? 'in < 1m' : 'just now';
  }

  if (minutes < 60) {
    return isFuture ? `in ${minutes}m` : `${minutes}m ago`;
  }

  if (hours < 24) {
    const remMinutes = minutes % 60;
    const minPart = remMinutes > 0 ? ` ${remMinutes}m` : '';
    return isFuture ? `in ${hours}h${minPart}` : `${hours}h${minPart} ago`;
  }

  if (days === 1) {
    return isFuture ? 'tomorrow' : 'yesterday';
  }

  return isFuture ? `in ${days}d` : `${days}d ago`;
}

/**
 * Format milliseconds into HH:MM:SS countdown format
 */
export function formatCountdown(diffMs: number): {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  if (diffMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00' };
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { hours, minutes, seconds, formatted };
}
