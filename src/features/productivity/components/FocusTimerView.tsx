import { AlarmClock, ChevronLeft, ChevronUp, Square } from "lucide-react";
import { formatCountdown, formatDate, formatTime } from "@/shared/lib/formatters";

export function FocusTimerView({ now, timerEndsAt, remaining, onBack, onCollapse, onStart, onStop }: {
  now: Date;
  timerEndsAt: number | null;
  remaining: number;
  onBack: () => void;
  onCollapse: () => void;
  onStart: (minutes: number) => void;
  onStop: () => void;
}) {
  return (
    <div className="productivity-view">
      <header className="expanded-header tasks-header">
        <button className="icon-button" aria-label="Back to Hamin" title="Back" onClick={onBack}><ChevronLeft size={16} /></button>
        <div className="settings-title"><strong>Focus timer</strong><small>{formatDate(now)}</small></div>
        <button className="icon-button settings-collapse" aria-label="Collapse Hamin" onClick={onCollapse}><ChevronUp size={16} /></button>
      </header>
      <div className="timer-face"><AlarmClock size={22} /><strong>{timerEndsAt ? formatCountdown(remaining) : formatTime(now)}</strong><small>{timerEndsAt ? "Focus session in progress" : "Choose a timer"}</small></div>
      <div className="timer-actions">{[5, 15, 25].map((minutes) => <button key={minutes} onClick={() => onStart(minutes)}>{minutes} min</button>)}<button aria-label="Stop timer" disabled={!timerEndsAt} onClick={onStop}><Square size={11} /> Stop</button></div>
    </div>
  );
}
