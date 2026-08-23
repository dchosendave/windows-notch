import { useCallback, useEffect, useState } from "react";

const FOCUS_END_KEY = "hamin.focus.endsAt";
const FOCUS_DURATION_KEY = "hamin.focus.duration";
const FOCUS_HISTORY_KEY = "hamin.focus.history";

function restoredHistory(): number[] {
  try { return (JSON.parse(window.localStorage.getItem(FOCUS_HISTORY_KEY) ?? "[]") as number[]).filter((time) => Number.isFinite(time)); } catch { return []; }
}

function restoredEndTime() {
  const value = Number(window.localStorage.getItem(FOCUS_END_KEY));
  return Number.isFinite(value) && value > Date.now() ? value : null;
}

export function useFocusTimer(onComplete: () => void) {
  const [endsAt, setEndsAt] = useState<number | null>(restoredEndTime);
  const [remaining, setRemaining] = useState(() => Math.max(0, (restoredEndTime() ?? 0) - Date.now()));
  const [duration, setDuration] = useState(() => Number(window.localStorage.getItem(FOCUS_DURATION_KEY)) || 0);
  const [history, setHistory] = useState(restoredHistory);

  const start = useCallback((minutes: number) => {
    const duration = minutes * 60_000;
    const nextEnd = Date.now() + duration;
    window.localStorage.setItem(FOCUS_END_KEY, String(nextEnd));
    window.localStorage.setItem(FOCUS_DURATION_KEY, String(duration));
    setDuration(duration);
    setEndsAt(nextEnd);
    setRemaining(duration);
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
    window.localStorage.removeItem(FOCUS_END_KEY);
    window.localStorage.removeItem(FOCUS_DURATION_KEY);
    setDuration(0);
  }, []);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const next = Math.max(0, endsAt - Date.now());
      setRemaining(next);
      if (next === 0) {
        setEndsAt(null);
        window.localStorage.removeItem(FOCUS_END_KEY);
        window.localStorage.removeItem(FOCUS_DURATION_KEY);
        setDuration(0);
        setHistory((items) => {
          const nextHistory = [Date.now(), ...items].slice(0, 100);
          window.localStorage.setItem(FOCUS_HISTORY_KEY, JSON.stringify(nextHistory));
          return nextHistory;
        });
        onComplete();
      }
    };
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [endsAt, onComplete]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60_000;
  return { endsAt, remaining, duration, completedThisWeek: history.filter((time) => time >= weekAgo).length, start, stop };
}
