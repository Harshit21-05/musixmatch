import { MusicEvent, SCRIPT_CONFIGS } from '@/types';
import { formatIST } from './date';

/**
 * Maps raw internal state identifiers to human-readable state names
 */
export function getFriendlyStateName(state: string): string {
  const map: Record<string, string> = {
    rumor: 'Rumor',
    announced: 'Announced',
    teaser: 'Teaser Released',
    scheduled: 'Scheduled Premiere',
    upcoming: 'Upcoming',
    released: 'Released',
    unannounced_drop: 'Unannounced Surprise Drop',
    live_on_dsp: 'Live on DSP',
  };
  return map[state] || state;
}

/**
 * Escapes characters for iCalendar format according to RFC 5545
 */
export function escapeICS(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Formats a Date or ISO string into iCalendar UTC timestamp format (YYYYMMDDTHHMMSSZ)
 */
export function formatICSDateUTC(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return formatICSDateUTC(new Date());
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return formatICSDateUTC(new Date());
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Folds lines longer than 75 octets according to RFC 5545 Section 3.1:
 * "Lines of text SHOULD NOT be longer than 75 octets, excluding the line break.
 * Where a line exceeds this length, it SHOULD be folded into multiple lines by
 * inserting a CRLF immediately followed by a single linear white space character."
 */
export function foldICSLine(line: string): string {
  const MAX_OCTETS = 75;
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= MAX_OCTETS) {
    return line;
  }

  const chunks: string[] = [];
  let currentStart = 0;

  while (currentStart < line.length) {
    let low = currentStart + 1;
    let high = line.length;
    let bestCut = currentStart + 1;
    // On continuation lines, 1 byte is consumed by the initial space character
    const limit = chunks.length === 0 ? MAX_OCTETS : MAX_OCTETS - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const sub = line.slice(currentStart, mid);
      if (encoder.encode(sub).length <= limit) {
        bestCut = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const chunk = line.slice(currentStart, bestCut);
    chunks.push(chunks.length === 0 ? chunk : ` ${chunk}`);
    currentStart = bestCut;
  }

  return chunks.join('\r\n');
}

/**
 * Generates an RFC 5545 compliant iCalendar string with:
 * - Folded lines <= 75 octets
 * - CRLF (\r\n) line endings
 * - SEQUENCE (incremented on changes)
 * - LAST-MODIFIED in UTC
 * - Full language name (e.g. "Telugu", "Hindi")
 * - Stable UID per event: songradar-[id]@songradar.app
 * - 30-minute advance alarm
 */
export function buildICSContent(events: MusicEvent[]): string {
  const nowUTC = formatICSDateUTC(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Song Radar//Indian Music Radar Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Song Radar Upcoming Releases',
    'X-WR-TIMEZONE:Asia/Kolkata',
  ];

  for (const event of events) {
    const eventTime = event.date_time_ist || event.releaseTime;
    const startUTC = formatICSDateUTC(eventTime);
    // Duration: 30 minutes for single track drops
    const endDate = new Date(new Date(eventTime).getTime() + 30 * 60 * 1000);
    const endUTC = formatICSDateUTC(endDate);

    const langName = SCRIPT_CONFIGS[event.language]?.name || event.language;
    const friendlyState = getFriendlyStateName(event.state);
    const summary = escapeICS(`🎵 ${event.songTitle} (${event.movieTitle || event.movie_or_artist})`);
    const singers = event.singers?.length ? event.singers.join(', ') : 'TBA';
    const composer = event.composer || event.music_director || 'TBA';
    const link = event.youtubeUrl || event.link || '';

    const descriptionText = [
      `Song: ${event.songTitle}`,
      `Movie / Artist: ${event.movieTitle || event.movie_or_artist}`,
      `Language: ${langName}`,
      `Music Director: ${composer}`,
      `Singers: ${singers}`,
      `State: ${friendlyState}`,
      `Release Time (IST): ${formatIST(eventTime)}`,
      link ? `Stream / Video: ${link}` : '',
      'Tracked live by Song Radar automation',
    ]
      .filter(Boolean)
      .join('\n');

    const escapedDesc = escapeICS(descriptionText);
    const escapedLink = escapeICS(link);

    // Stable UID guaranteed per event ID
    const uid = `songradar-${event.id}@songradar.app`;

    // SEQUENCE increments with version or event history count
    const sequence = event.sequence ?? Math.max(0, (event.timeline?.length || 1) - 1);
    const lastModifiedUTC = formatICSDateUTC(event.updated_at || event.releaseTime);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `SEQUENCE:${sequence}`,
      `LAST-MODIFIED:${lastModifiedUTC}`,
      `DTSTAMP:${nowUTC}`,
      `DTSTART:${startUTC}`,
      `DTEND:${endUTC}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${escapedDesc}`,
      escapedLink ? `URL:${escapedLink}` : '',
      `STATUS:CONFIRMED`,
      // 30-minute-before advance alarm
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Song Premiere in 30m: ${event.songTitle} (${event.movieTitle || event.movie_or_artist})`)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldICSLine).join('\r\n') + '\r\n';
}

/**
 * Downloads .ics calendar file on client
 */
export function exportEventsToICS(events: MusicEvent[], filename = 'song_radar_upcoming.ics') {
  if (events.length === 0) return;
  const icsContent = buildICSContent(events);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
  triggerDownload(blob, filename);
}

export function exportEventsToJSON(events: MusicEvent[], filename = 'song_radar_export.json') {
  const jsonStr = JSON.stringify(events, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  triggerDownload(blob, filename);
}

export function exportEventsToCSV(events: MusicEvent[], filename = 'song_radar_export.csv') {
  if (events.length === 0) return;

  const headers = [
    'ID',
    'Song Title',
    'Movie / Artist',
    'Language',
    'Tier',
    'State',
    'Release Time (IST)',
    'Confidence',
    'Music Director',
    'Singers',
    'Lyricist',
    'Link',
  ];
  const rows = events.map(e => [
    `"${e.id}"`,
    `"${e.songTitle.replace(/"/g, '""')}"`,
    `"${(e.movieTitle || e.movie_or_artist || '').replace(/"/g, '""')}"`,
    `"${e.language}"`,
    `"Tier ${e.tier}"`,
    `"${getFriendlyStateName(e.state)}"`,
    `"${formatIST(e.date_time_ist || e.releaseTime)}"`,
    `"${e.confidence}%"`,
    `"${(e.composer || e.music_director || '').replace(/"/g, '""')}"`,
    `"${(e.singers || []).join(', ').replace(/"/g, '""')}"`,
    `"${(e.lyricist || '').replace(/"/g, '""')}"`,
    `"${e.youtubeUrl || e.link || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
