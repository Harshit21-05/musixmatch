import { z } from 'zod';

export const SupportedLanguages = [
  'hi',
  'ta',
  'te',
  'kn',
  'ml',
  'bn',
  'pa',
  'en',
] as const;

export const SupportedStates = [
  'rumor',
  'announced',
  'teaser',
  'scheduled',
  'released',
  'unannounced_drop',
  'live_on_dsp',
] as const;

export const ConfidenceLevels = ['high', 'medium', 'low'] as const;

export const IngestEventSchema = z.object({
  song_title: z.string().min(1, 'song_title is required'),
  movie_or_artist: z.string().min(1, 'movie_or_artist is required'),
  language: z.enum(SupportedLanguages, {
    message: `language must be one of: ${SupportedLanguages.join(', ')}`,
  }),
  state: z.enum(SupportedStates, {
    message: `state must be one of: ${SupportedStates.join(', ')}`,
  }),
  date_time_ist: z
    .string()
    .nullable()
    .optional()
    .refine(
      val => {
        if (!val) return true;
        const d = new Date(val);
        return !isNaN(d.getTime());
      },
      { message: 'date_time_ist must be a valid ISO 8601 date string or null' }
    ),
  singers: z.array(z.string()).default([]),
  music_director: z.string().nullable().optional(),
  lyricist: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
  source: z.string().min(1, 'source is required'),
  source_url: z.string().nullable().optional(),
  confidence: z.enum(ConfidenceLevels, {
    message: `confidence must be high, medium, or low`,
  }),
  raw_note: z.string().nullable().optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  hype_score: z.number().min(0).max(100).optional(),
  thumbnail: z.string().nullable().optional(),
});

export type IngestEventInput = z.infer<typeof IngestEventSchema>;

export const IngestPayloadSchema = z.union([
  IngestEventSchema,
  z.array(IngestEventSchema).max(200, 'Batch size exceeds maximum limit of 200 events'),
]);
