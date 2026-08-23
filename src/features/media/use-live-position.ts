import { useEffect, useState } from "react";
import type { MediaSession } from "./media-schema";

export function useLivePosition(session: MediaSession | null) {
  const [position, setPosition] = useState(session?.positionMs ?? 0);

  useEffect(() => {
    const calculate = () => {
      if (!session) return 0;
      if (!session.isPlaying) return session.positionMs;
      const elapsed = Math.max(0, Date.now() - session.updatedAtMs);
      return Math.min(session.durationMs || Number.MAX_SAFE_INTEGER, session.positionMs + elapsed);
    };
    setPosition(calculate());
    if (!session?.isPlaying) return;
    const timer = window.setInterval(() => setPosition(calculate()), 1_000);
    return () => window.clearInterval(timer);
  }, [session]);

  return position;
}
