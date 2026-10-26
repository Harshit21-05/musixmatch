/**
 * Dedup key calculation and dirty-input coercion for Song Radar
 *
 * Rules:
 * - Match only within the same movie/artist + language
 * - Normalize case, punctuation, diacritics, and transliteration
 * - Strip "Official Video/Lyrical/Full Song" suffixes
 * - Crucial: do NOT merge Reprise / Remix / Part 2 / Acoustic / Lo-Fi with the original
 * - Coerce "not stated", "N/A", "" to null
 */

import { parseToTimestamptz } from '@/utils/date';

/**
 * Coerces dirty input strings like "not stated", "N/A", "none", "" to null
 */
export function coerceDirtyInput<T>(value: T): T | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    if (['not stated', 'n/a', 'na', 'none', 'null', 'undefined', '-', '--'].includes(lower)) {
      return null;
    }
    return trimmed as unknown as T;
  }
  return value;
}

/**
 * Coerces an entire raw event object before validation
 */
export function coerceEventPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const coerced: Record<string, unknown> = { ...raw };

  // Strings to coerce to null
  const nullableStringFields = [
    'date_time_ist',
    'music_director',
    'lyricist',
    'link',
    'source_url',
    'raw_note',
    'thumbnail',
  ];

  for (const field of nullableStringFields) {
    if (field in coerced) {
      if (field === 'date_time_ist') {
        const cleaned = coerceDirtyInput(coerced[field]);
        coerced[field] = parseToTimestamptz(cleaned as string | null);
      } else {
        coerced[field] = coerceDirtyInput(coerced[field]);
      }
    }
  }

  // Coerce singers array
  if ('singers' in coerced) {
    const singersRaw = coerced.singers;
    if (Array.isArray(singersRaw)) {
      coerced.singers = singersRaw
        .map(s => (typeof s === 'string' ? s.trim() : ''))
        .filter(s => s.length > 0 && coerceDirtyInput(s) !== null);
    } else if (typeof singersRaw === 'string') {
      const coercedStr = coerceDirtyInput(singersRaw);
      if (!coercedStr) {
        coerced.singers = [];
      } else {
        coerced.singers = (coercedStr as string)
          .split(/[,/&]+/)
          .map(s => s.trim())
          .filter(s => s.length > 0 && coerceDirtyInput(s) !== null);
      }
    } else {
      coerced.singers = [];
    }
  }

  return coerced;
}

/**
 * Extracts distinct song variants so Reprise / Remix / Part 2 are NOT merged with original
 */
function extractVariantSuffix(title: string): string {
  const lower = title.toLowerCase();
  const variants: string[] = [];

  if (/\b(reprise)\b/i.test(lower)) variants.push('reprise');
  if (/\b(remix)\b/i.test(lower)) variants.push('remix');
  if (/\b(lo-?fi|chillout)\b/i.test(lower)) variants.push('lofi');
  if (/\b(acoustic)\b/i.test(lower)) variants.push('acoustic');
  if (/\b(unplugged)\b/i.test(lower)) variants.push('unplugged');
  if (/\b(part\s*2|pt\s*2|part\s*ii|part\s*two)\b/i.test(lower)) variants.push('part2');
  if (/\b(part\s*1|pt\s*1|part\s*i|part\s*one)\b/i.test(lower)) variants.push('part1');
  if (/\b(female\s*version|female)\b/i.test(lower)) variants.push('female');
  if (/\b(male\s*version|male)\b/i.test(lower)) variants.push('male');
  if (/\b(sad\s*version)\b/i.test(lower)) variants.push('sad');
  if (/\b(reloaded|revamped)\b/i.test(lower)) variants.push('reloaded');
  if (/\b(club\s*mix)\b/i.test(lower)) variants.push('clubmix');

  return variants.sort().join('_');
}

/**
 * Strips promotional video/audio suffixes from title before key computation
 */
function stripPromoNoise(title: string): string {
  return title
    .replace(/\[\s*(official\s*)?(hd\s*)?(4k\s*)?(video|lyrical|audio|song|music\s*video|teaser|promo)\s*\]/gi, '')
    .replace(/\(\s*(official\s*)?(hd\s*)?(4k\s*)?(video|lyrical|audio|song|music\s*video|teaser|promo)\s*\)/gi, '')
    .replace(/-\s*(official\s*)?(hd\s*)?(4k\s*)?(video|lyrical|audio|song|music\s*video|teaser|promo)$/gi, '')
    .replace(/\b(official\s+video|official\s+lyrical|full\s+video\s+song|full\s+song|lyric\s+video|lyrical\s+video|video\s+song)\b/gi, '')
    .trim();
}

/**
 * Normalizes transliteration and phonetic variations common in Indian languages
 */
function normalizeTransliteration(str: string): string {
  return str
    // Normalize diacritics (e.g. é -> e, ā -> a)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    // Transliteration equivalences
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ph/g, 'f')
    .replace(/w/g, 'v')
    .replace(/th/g, 't')
    .replace(/dh/g, 'd')
    .replace(/kh/g, 'k')
    .replace(/bh/g, 'b')
    .replace(/zh/g, 's')
    .replace(/sh/g, 's')
    // Remove all punctuation and symbols
    .replace(/[^\w\s]/g, '')
    // Collapse double consonants to single (e.g. chuttamalle -> chutamale)
    .replace(/([a-z])\1+/g, '$1')
    // Collapse whitespace
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Computes canonical dedup key for an event
 * Guarantee: match only within the same movie/artist + language
 * Guarantee: Reprise, Remix, Part 2 are NOT merged
 */
export function computeDedupKey(
  movieOrArtist: string,
  songTitle: string,
  language: string
): string {
  const normEntity = normalizeTransliteration(movieOrArtist || '');
  const normLang = (language || 'en').toLowerCase().trim();

  // Extract variant qualifier (e.g. reprise, remix, part2)
  const variant = extractVariantSuffix(songTitle);

  // Clean promo suffixes from title
  const cleanTitle = stripPromoNoise(songTitle || '');
  const normTitle = normalizeTransliteration(cleanTitle);

  const baseKey = `${normEntity}__${normLang}__${normTitle}`;
  return variant ? `${baseKey}__${variant}` : baseKey;
}

/**
 * State ranking rule:
 * rumor < announced < teaser < scheduled < released < live_on_dsp
 * Note: unannounced_drop has rank 5 (released rank)
 */
export const STATE_RANK: Record<string, number> = {
  rumor: 1,
  announced: 2,
  teaser: 3,
  scheduled: 4,
  released: 5,
  unannounced_drop: 5,
  live_on_dsp: 6,
  // legacy/fallback aliases
  unconfirmed: 1,
  upcoming: 4,
  live: 5,
};

/**
 * Checks if incomingState is allowed to update existingState without regressing
 */
export function isStateProgressionAllowed(
  existingState: string,
  incomingState: string
): boolean {
  const currentRank = STATE_RANK[existingState] ?? 0;
  const newRank = STATE_RANK[incomingState] ?? 0;

  // Never move state backwards
  return newRank >= currentRank;
}
