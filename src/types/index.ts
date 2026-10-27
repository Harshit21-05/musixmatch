export type Language = 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'bn' | 'pa' | 'en';

export interface ScriptConfig {
  code: Language;
  name: string;
  nativeName: string;
  fontClass: string;
  lineHeightScale: string; // Tuned line-height multiplier for complex Indic scripts
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const SCRIPT_CONFIGS: Record<Language, ScriptConfig> = {
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    fontClass: 'font-devanagari',
    lineHeightScale: 'leading-relaxed',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/40',
    badgeText: 'text-orange-400',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    fontClass: 'font-tamil',
    lineHeightScale: 'leading-loose',
    badgeBg: 'bg-amber-500/15',
    badgeBorder: 'border-amber-500/40',
    badgeText: 'text-amber-400',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    fontClass: 'font-telugu',
    lineHeightScale: 'leading-loose',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/40',
    badgeText: 'text-emerald-400',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    fontClass: 'font-kannada',
    lineHeightScale: 'leading-loose',
    badgeBg: 'bg-cyan-500/15',
    badgeBorder: 'border-cyan-500/40',
    badgeText: 'text-cyan-400',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    fontClass: 'font-malayalam',
    lineHeightScale: 'leading-loose',
    badgeBg: 'bg-purple-500/15',
    badgeBorder: 'border-purple-500/40',
    badgeText: 'text-purple-400',
  },
  bn: {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    fontClass: 'font-bengali',
    lineHeightScale: 'leading-relaxed',
    badgeBg: 'bg-rose-500/15',
    badgeBorder: 'border-rose-500/40',
    badgeText: 'text-rose-400',
  },
  pa: {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    fontClass: 'font-gurmukhi',
    lineHeightScale: 'leading-relaxed',
    badgeBg: 'bg-yellow-500/15',
    badgeBorder: 'border-yellow-500/40',
    badgeText: 'text-yellow-400',
  },
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    fontClass: 'font-sans',
    lineHeightScale: 'leading-normal',
    badgeBg: 'bg-blue-500/15',
    badgeBorder: 'border-blue-500/40',
    badgeText: 'text-blue-400',
  },
};

export type Tier = 1 | 2 | 3;

/**
 * Canonical event states defined in requirements:
 * rumor | announced | teaser | scheduled | released | unannounced_drop | live_on_dsp
 * (with 'live' and 'upcoming' supported as UI/legacy aliases)
 */
export type EventState =
  | 'rumor'
  | 'announced'
  | 'teaser'
  | 'scheduled'
  | 'released'
  | 'unannounced_drop'
  | 'live_on_dsp'
  | 'live'
  | 'upcoming'
  | 'unconfirmed';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface TimelineNode {
  time: string;
  label: string;
  status: 'done' | 'active' | 'pending';
}

export interface CollectorSource {
  id?: string;
  name?: string;
  source?: string;
  url?: string;
  source_url?: string;
  confidence: ConfidenceLevel | number;
  first_seen_at?: string;
  updated?: string;
  is_demo?: boolean;
}

export interface EventHistoryItem {
  id: string;
  event_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export interface MusicEvent {
  id: string;
  dedup_key?: string;
  songTitle: string;
  movieTitle: string;
  song_title?: string;
  movie_or_artist?: string;
  nativeTitle?: string;
  language: Language;
  tier: Tier;
  state: EventState;
  releaseTime: string; // ISO 8601 string
  date_time_ist?: string | null;
  confidence: ConfidenceLevel | number; // High/Med/Low or 0-100
  youtubeUrl: string;
  link?: string;
  spotifyUrl?: string;
  thumbnail: string;
  singers: string[];
  composer: string;
  music_director?: string;
  lyricist: string;
  recordLabel?: string;
  source?: string;
  source_url?: string;
  raw_note?: string;
  hypeScore: number; // 0 to 100
  isNewDrop?: boolean;
  is_demo?: boolean;
  sequence?: number;
  timeline: TimelineNode[];
  sources: CollectorSource[];
  history?: EventHistoryItem[];
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Tasks personal workflow pipeline:
 * todo -> lyrics_found -> translating -> synced -> submitted -> done
 */
export type TaskColumn =
  | 'todo'
  | 'lyrics_found'
  | 'translating'
  | 'synced'
  | 'submitted'
  | 'done'
  | 'backlog'
  | 'queued'
  | 'processing'
  | 'review'
  | 'published';

export interface TaskItem {
  id: string;
  title: string;
  column: TaskColumn;
  status?: TaskColumn;
  priority: 'high' | 'medium' | 'low';
  associatedEventId?: string;
  event_id?: string;
  eventSongTitle?: string;
  eventMovieTitle?: string;
  language?: Language;
  assignedTo?: string;
  dueDate?: string;
  due_date?: string;
  notes?: string;
  tags?: string[];
}

export interface WatchlistItem {
  id: string;
  name?: string;
  title: string;
  type: 'movie' | 'artist' | 'composer' | 'label';
  language: Language;
  tier: Tier;
  hype: number;
  hype_score?: number;
  expectedDropDate: string;
  release_date?: string | null;
  tracked_reason?: string;
  trackedEventsCount: number;
  alertEnabled: boolean;
  notes?: string;
}

export type CollectorStatus = 'healthy' | 'degraded' | 'error' | 'syncing';

export interface CollectorHealth {
  id: string;
  name: string;
  source: string;
  status: CollectorStatus;
  lastSync: string;
  itemsIngested: number;
  latencyMs: number;
  errorRate: number;
  schedule: string;
  is_demo?: boolean;
}

export interface IngestLogItem {
  id: string;
  timestamp: string;
  count_created: number;
  count_updated: number;
  count_ignored: number;
  status: 'success' | 'partial' | 'error';
  error_details?: string;
}

export interface FeedbackReport {
  id: string;
  event_id: string;
  song_title?: string;
  reason: 'wrong_date' | 'wrong_credits' | 'fake_rumor' | 'duplicate' | 'other';
  note?: string;
  created_at: string;
}

export type DensityMode = 'compact' | 'comfortable';
export type ThemeMode = 'dark' | 'light' | 'system';
export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';
