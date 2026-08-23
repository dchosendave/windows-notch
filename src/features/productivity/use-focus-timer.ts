import { useCallback, useEffect, useState } from "react";

const FOCUS_END_KEY = "hamin.focus.endsAt";

function restoredEndTime() {
  const value = Number(window.localStorage.getItem(FOCUS_END_KEY));
  return Number.isFinite(value) && value > Date.now() ? value : null;
}

export function useFocusTimer(onComplete: () => void) {
  const [endsAt, setEndsAt] = useState<number | null>(restoredEndTime);
  const [remaining, setRemaining] = useState(() => Math.max(0, (restoredEndTime() ?? 0) - Date.now()));

  const start = useCallback((minutes: number) => {
    const duration = minutes * 60_000;
    const nextEnd = Date.now() + duration;
    window.localStorage.setItem(FOCUS_END_KEY, String(nextEnd));
    setEndsAt(nextEnd);
    setRemaining(duration);
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
    window.localStorage.removeItem(FOCUS_END_KEY);
  }, []);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const next = Math.max(0, endsAt - Date.now());
      setRemaining(next);
      if (next === 0) {
        setEndsAt(null);
        window.localStorage.removeItem(FOCUS_END_KEY);
        onComplete();
      }
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [endsAt, onComplete]);

  return { endsAt, remaining, start, stop };
}
