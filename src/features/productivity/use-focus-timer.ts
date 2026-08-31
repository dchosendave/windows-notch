import { useCallback, useEffect, useState } from "react";
import { z } from "zod";

const FOCUS_END_KEY = "hamin.focus.endsAt";
const FOCUS_DURATION_KEY = "hamin.focus.duration";
const FOCUS_HISTORY_KEY = "hamin.focus.history";
const FOCUS_PAUSED_KEY = "hamin.focus.pausedRemaining";
const focusHistorySchema = z.array(z.number().int().nonnegative()).max(100);
const MAX_FOCUS_DURATION = 180 * 60_000;

function restoredHistory(): number[] {
  try {
    const parsed = focusHistorySchema.safeParse(JSON.parse(window.localStorage.getItem(FOCUS_HISTORY_KEY) ?? "[]"));
    return parsed.success ? parsed.data.filter((time) => time <= Date.now()) : [];
  } catch { return []; }
}

function restoredEndTime() {
  const value = Number(window.localStorage.getItem(FOCUS_END_KEY));
  return Number.isFinite(value) && value > Date.now() ? value : null;
}

export function useFocusTimer(onComplete: () => void) {
  const [endsAt, setEndsAt] = useState<number | null>(restoredEndTime);
  const [remaining, setRemaining] = useState(() => {
    const paused = Number(window.localStorage.getItem(FOCUS_PAUSED_KEY));
    if (Number.isFinite(paused) && paused > 0 && paused <= MAX_FOCUS_DURATION) return paused;
    return Math.max(0, (restoredEndTime() ?? 0) - Date.now());
  });
  const [duration, setDuration] = useState(() => {
    const value = Number(window.localStorage.getItem(FOCUS_DURATION_KEY));
    return Number.isFinite(value) && value > 0 && value <= MAX_FOCUS_DURATION ? value : 0;
  });
  const [history, setHistory] = useState(restoredHistory);

  const start = useCallback((minutes: number) => {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) return;
    const duration = minutes * 60_000;
    const nextEnd = Date.now() + duration;
    window.localStorage.setItem(FOCUS_END_KEY, String(nextEnd));
    window.localStorage.setItem(FOCUS_DURATION_KEY, String(duration));
    window.localStorage.removeItem(FOCUS_PAUSED_KEY);
    setDuration(duration);
    setEndsAt(nextEnd);
    setRemaining(duration);
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setRemaining(0);
    window.localStorage.removeItem(FOCUS_END_KEY);
    window.localStorage.removeItem(FOCUS_DURATION_KEY);
    window.localStorage.removeItem(FOCUS_PAUSED_KEY);
    setDuration(0);
  }, []);

  const pause = useCallback(() => {
    if (!endsAt) return;
    const next = Math.max(0, endsAt - Date.now());
    setRemaining(next);
    setEndsAt(null);
    window.localStorage.removeItem(FOCUS_END_KEY);
    window.localStorage.setItem(FOCUS_PAUSED_KEY, String(next));
  }, [endsAt]);

  const resume = useCallback(() => {
    if (endsAt || remaining <= 0) return;
    const nextEnd = Date.now() + remaining;
    setEndsAt(nextEnd);
    window.localStorage.setItem(FOCUS_END_KEY, String(nextEnd));
    window.localStorage.removeItem(FOCUS_PAUSED_KEY);
  }, [endsAt, remaining]);

  useEffect(() => {
    if (!endsAt) return;
    const update = () => {
      const next = Math.max(0, endsAt - Date.now());
      setRemaining(next);
      if (next === 0) {
        setEndsAt(null);
        window.localStorage.removeItem(FOCUS_END_KEY);
        window.localStorage.removeItem(FOCUS_DURATION_KEY);
        window.localStorage.removeItem(FOCUS_PAUSED_KEY);
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
  return { endsAt, remaining, duration, active: remaining > 0, paused: !endsAt && remaining > 0, completedThisWeek: history.filter((time) => time >= weekAgo).length, start, stop, pause, resume };
}
