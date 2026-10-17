import { useEffect, useState, type CSSProperties } from "react";
import type { MediaSession } from "@/features/media/media-schema";
import { useLivePosition } from "@/features/media/use-live-position";

/** Live playback position plus a local drag preview that is committed as a seek. */
export function useMediaTimeline(session: MediaSession | null, seek: (positionMs: number) => Promise<boolean>) {
  const livePosition = useLivePosition(session);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);

  useEffect(() => setSeekPreview(null), [session?.sourceAppId, session?.title, session?.positionMs]);

  const displayedPosition = seekPreview ?? livePosition;
  const progress = session?.durationMs ? Math.min(100, displayedPosition / session.durationMs * 100) : 0;
  const commitSeek = async (positionMs: number) => {
    if (!session?.canSeek) return;
    if (!(await seek(positionMs))) setSeekPreview(null);
  };

  return {
    displayedPosition,
    timelineStyle: { "--timeline-progress": `${progress}%` } as CSSProperties,
    onSeekPreview: setSeekPreview,
    onCommitSeek: (positionMs: number) => void commitSeek(positionMs),
  };
}
