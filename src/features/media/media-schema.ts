import { z } from "zod";

export const mediaSessionSchema = z.object({
  sourceAppId: z.string(),
  title: z.string(),
  artist: z.string(),
  albumTitle: z.string(),
  artworkDataUrl: z.string().nullable(),
  isPlaying: z.boolean(),
  positionMs: z.number().nonnegative(),
  durationMs: z.number().nonnegative(),
  updatedAtMs: z.number().nonnegative(),
  canPlay: z.boolean(),
  canPause: z.boolean(),
  canGoPrevious: z.boolean(),
  canGoNext: z.boolean(),
  canSeek: z.boolean(),
});

export const nullableMediaSessionSchema = mediaSessionSchema.nullable();

export type MediaSession = z.infer<typeof mediaSessionSchema>;
export type MediaAction = "togglePlayPause" | "previous" | "next";

export const mediaSessionSummarySchema = z.object({
  sourceAppId: z.string(),
  title: z.string(),
  artist: z.string(),
  isPlaying: z.boolean(),
});
export type MediaSessionSummary = z.infer<typeof mediaSessionSummarySchema>;
