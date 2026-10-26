const assert = require('assert');

async function testCalendarFeed() {
  console.log('🧪 Testing /api/calendar.ics Token-Protected Feed...\n');

  // 1. Without token -> 401
  const resNoAuth = await fetch('http://localhost:3000/api/calendar.ics');
  assert(resNoAuth.status === 401, 'Request without token must be 401');
  console.log('  ✓ Missing token returned 401 Unauthorized');

  // 2. With wrong token -> 401
  const resBadAuth = await fetch('http://localhost:3000/api/calendar.ics?token=wrong-token');
  assert(resBadAuth.status === 401, 'Request with bad token must be 401');
  console.log('  ✓ Invalid token returned 401 Unauthorized');

  // 3. With valid token -> 200 text/calendar
  const resValid = await fetch('http://localhost:3000/api/calendar.ics?token=songradar2026');
  assert(resValid.status === 200, `Valid token must return 200 (got ${resValid.status})`);
  assert(resValid.headers.get('content-type').includes('text/calendar'), 'Content-Type must be text/calendar');
  const text = await resValid.text();

  console.log('  ✓ Valid token returned 200 with text/calendar Content-Type');

  // 4. Validate RFC 5545 specifications
  assert(text.includes('BEGIN:VCALENDAR'), 'Missing BEGIN:VCALENDAR');
  assert(text.includes('END:VCALENDAR'), 'Missing END:VCALENDAR');
  assert(text.includes('SEQUENCE:'), 'Missing SEQUENCE field');
  assert(text.includes('LAST-MODIFIED:'), 'Missing LAST-MODIFIED field');
  assert(text.includes('TRIGGER:-PT30M'), 'Missing 30m advance alarm');
  assert(text.includes('Telugu') || text.includes('Hindi') || text.includes('Tamil'), 'Must show full language name');

  // 5. Line length constraint: RFC 5545 Section 3.1: no line > 75 octets
  const encoder = new TextEncoder();
  const rawLines = text.split('\r\n');
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const octets = encoder.encode(line).length;
    if (octets > 75) {
      throw new Error(`Line ${i + 1} exceeds 75 octets (${octets} octets): "${line}"`);
    }
  }
  console.log(`  ✓ Verified all ${rawLines.length} lines strictly satisfy RFC 5545 <= 75 octet limit`);
  console.log('  ✓ Verified SEQUENCE, LAST-MODIFIED, CRLF line endings, and full language names');

  console.log('\n🎉 /api/calendar.ics subscription feed verified 100%!');
}

testCalendarFeed().catch(err => {
  console.error('❌ Calendar test failed:', err);
  process.exit(1);
});
