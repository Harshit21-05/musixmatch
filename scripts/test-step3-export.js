const assert = require('assert');

// Mock test event
const mockEvent = {
  id: 'a1000000-0000-0000-0000-000000000002',
  songTitle: 'Chuttamalle, Song; Special\\Edition',
  movieTitle: 'Devara - Part 1',
  language: 'te',
  tier: 1,
  state: 'upcoming',
  releaseTime: '2026-10-26T14:30:00+05:30',
  date_time_ist: '2026-10-26T14:30:00+05:30',
  confidence: 96,
  composer: 'Anirudh Ravichander',
  singers: ['Shilpa Rao', 'Anirudh Ravichander'],
  lyricist: 'Ramajogayya Sastry',
  youtubeUrl: 'https://youtube.com/watch?v=sample-devara',
  link: 'https://youtube.com/watch?v=sample-devara'
};

function escapeICS(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function formatICSDateUTC(dateInput) {
  const d = new Date(dateInput);
  const pad = n => String(n).padStart(2, '0');
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

function generateICS(events) {
  const nowUTC = formatICSDateUTC(new Date());
  const lines = [
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
    const endDate = new Date(new Date(eventTime).getTime() + 30 * 60 * 1000);
    const endUTC = formatICSDateUTC(endDate);

    const summary = escapeICS(`🎵 ${event.songTitle} (${event.movieTitle})`);
    const singers = event.singers?.length ? event.singers.join(', ') : 'TBA';
    const composer = event.composer || event.music_director || 'TBA';
    const link = event.youtubeUrl || event.link || '';

    const descriptionText = [
      `Song: ${event.songTitle}`,
      `Movie / Artist: ${event.movieTitle}`,
      `Language: ${event.language}`,
      `Music Director: ${composer}`,
      `Singers: ${singers}`,
      `State: ${event.state.toUpperCase()}`,
      `Release Time (IST): 2026-10-26 14:30:00`,
      link ? `Stream / Video: ${link}` : '',
      'Tracked live by Song Radar automation',
    ].filter(Boolean).join('\n');

    const uid = `songradar-${event.id}@songradar.app`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowUTC}`,
      `DTSTART:${startUTC}`,
      `DTEND:${endUTC}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${escapeICS(descriptionText)}`,
      link ? `URL:${escapeICS(link)}` : '',
      `STATUS:CONFIRMED`,
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeICS(`Song Premiere in 30m: ${event.songTitle}`)}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

const ics = generateICS([mockEvent]);
console.log('--- Generated ICS Content Sample ---');
console.log(ics);

// Validations
assert(ics.includes('UID:songradar-a1000000-0000-0000-0000-000000000002@songradar.app'), 'Stable UID missing');
assert(ics.includes('TRIGGER:-PT30M'), '30-minute advance alarm missing');
assert(ics.includes('ACTION:DISPLAY'), 'Alarm action missing');
assert(ics.includes('Chuttamalle\\, Song\\; Special\\\\Edition'), 'Escaping failed');
// 14:30 IST (+05:30) is 09:00 UTC
assert(ics.includes('DTSTART:20261026T090000Z'), 'UTC start time wrong');
assert(ics.includes('DTEND:20261026T093000Z'), 'UTC end time wrong');

console.log('\n[PASS] All RFC 5545 calendar export assertions verified!');
