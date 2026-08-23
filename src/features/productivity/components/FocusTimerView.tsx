import { AlarmClock, ChevronLeft, ChevronUp, Square } from "lucide-react";
import type { CSSProperties } from "react";
import { formatCountdown, formatDate, formatTime } from "@/shared/lib/formatters";
import { motion } from "motion/react";
import { MotionButton } from "@/shared/motion/MotionButton";
import { RollingText } from "@/shared/motion/RollingText";

export function FocusTimerView({ now, timerEndsAt, remaining, duration, presets, completedThisWeek, onBack, onCollapse, onStart, onStop }: {
  now: Date;
  timerEndsAt: number | null;
  remaining: number;
  duration: number;
  presets: number[];
  completedThisWeek: number;
  onBack: () => void;
  onCollapse: () => void;
  onStart: (minutes: number) => void;
  onStop: () => void;
}) {
  const progress = timerEndsAt && duration ? Math.max(0, Math.min(1, 1 - remaining / duration)) : 0;
  return (
    <div className="productivity-view">
      <header className="expanded-header tasks-header">
        <MotionButton className="icon-button" aria-label="Back to Hamin" title="Back" onClick={onBack}><ChevronLeft size={16} /></MotionButton>
        <div className="settings-title"><strong>Focus timer</strong><small>{formatDate(now)}</small></div>
        <MotionButton className="icon-button settings-collapse" aria-label="Collapse Hamin" onClick={onCollapse}><ChevronUp size={16} /></MotionButton>
      </header>
      <div className="timer-face"><motion.span className="timer-progress" animate={{ "--timer-progress": `${progress * 360}deg` }} transition={{ duration: 0.35 }} style={{ "--timer-progress": "0deg" } as CSSProperties}><AlarmClock size={22} /></motion.span><strong><RollingText value={timerEndsAt ? formatCountdown(remaining) : formatTime(now)} /></strong><small>{timerEndsAt ? "Focus session in progress" : `${completedThisWeek} completed this week`}</small></div>
      <div className="timer-actions">{presets.map((minutes) => <MotionButton key={minutes} onClick={() => onStart(minutes)}>{minutes} min</MotionButton>)}<MotionButton aria-label="Stop timer" disabled={!timerEndsAt} onClick={onStop}><Square size={11} /> Stop</MotionButton></div>
    </div>
  );
}
