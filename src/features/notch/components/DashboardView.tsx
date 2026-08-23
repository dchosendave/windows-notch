import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlarmClock, CalendarDays, ChevronUp, Clock3, Command, Music2, Pause, Play, Settings, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type { MediaAction, MediaSession, MediaSessionSummary } from "@/features/media/media-schema";
import type { PowerState } from "@/features/power/power-schema";
import { BatteryIcon } from "@/features/power/BatteryIcon";
import { formatDate, formatDuration, formatSourceName, formatTime } from "@/shared/lib/formatters";

type DashboardViewProps = {
  session: MediaSession | null;
  sessions: MediaSessionSummary[];
  loading: boolean;
  power: PowerState;
  now: Date;
  displayedPosition: number;
  timelineStyle: CSSProperties;
  onSeekPreview: (value: number | null) => void;
  onCommitSeek: (value: number) => void;
  onControl: (action: MediaAction) => void;
  onSelectSession: (sourceAppId: string) => void;
  onOpenProductivity: () => void;
  onOpenSystem: () => void;
  onOpenSettings: () => void;
  onOpenCommand: () => void;
  onCollapse: () => void;
};

export function DashboardView(props: DashboardViewProps) {
  const { session } = props;
  return <>
    <header className="expanded-header">
      <div className="source-label"><span className="source-dot" data-active={Boolean(session)} />{session && props.sessions.length > 1 ? <button className="source-session-button" title="Switch media player" onClick={() => { const index = props.sessions.findIndex((item) => item.sourceAppId === session.sourceAppId); props.onSelectSession(props.sessions[(index + 1) % props.sessions.length].sourceAppId); }}>{formatSourceName(session.sourceAppId)} · {props.sessions.length}</button> : session ? formatSourceName(session.sourceAppId) : "Hamin"}</div>
      <div className="header-actions">
        <button className="icon-button" aria-label="Open command palette" title="Commands" onClick={props.onOpenCommand}><Command size={15} /></button>
        <button className="icon-button" aria-label="Open focus timer" title="Focus timer" onClick={props.onOpenProductivity}><AlarmClock size={15} /></button>
        <button className="icon-button" aria-label="Open system controls" title="System controls" onClick={props.onOpenSystem}><Volume2 size={15} /></button>
        <button className="icon-button" aria-label="Open settings" title="Settings" onClick={props.onOpenSettings}><Settings size={15} /></button>
        <button className="icon-button" aria-label="Collapse Hamin" title="Collapse (Escape)" onClick={props.onCollapse}><ChevronUp size={16} /></button>
      </div>
    </header>
    {session ? (
      <div className="media-layout">
        <div className="artwork-placeholder" aria-hidden="true"><AnimatePresence mode="wait">{session.artworkDataUrl ? <motion.img key={session.artworkDataUrl.slice(-40)} src={session.artworkDataUrl} alt="" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} /> : <motion.div key="fallback" className="artwork-fallback"><Music2 size={28} /></motion.div>}</AnimatePresence></div>
        <div className="media-details">
          <div><p className="track-title" title={session.title || "Unknown title"}>{session.title || "Unknown title"}</p><p className="track-artist" title={session.artist || session.albumTitle}>{session.artist || session.albumTitle || formatSourceName(session.sourceAppId)}</p></div>
          <div className="timeline-row">
            <span>{formatDuration(props.displayedPosition)}</span>
            <input className="timeline-slider" type="range" aria-label="Playback position" aria-valuetext={`${formatDuration(props.displayedPosition)} of ${formatDuration(session.durationMs)}`} title={session.canSeek ? "Seek" : "Seeking is unavailable"} min={0} max={Math.max(1, session.durationMs)} step={1_000} value={Math.min(props.displayedPosition, Math.max(1, session.durationMs))} disabled={!session.canSeek || session.durationMs === 0} style={props.timelineStyle} onChange={(event) => props.onSeekPreview(Number(event.target.value))} onPointerUp={(event) => props.onCommitSeek(Number(event.currentTarget.value))} onKeyUp={(event) => props.onCommitSeek(Number(event.currentTarget.value))} onBlur={() => props.onSeekPreview(null)} />
            <span>{formatDuration(session.durationMs)}</span>
          </div>
          <div className="playback-controls">
            <button className="media-button" aria-label="Previous track" title="Previous" disabled={!session.canGoPrevious} onClick={() => props.onControl("previous")}><SkipBack size={17} fill="currentColor" /></button>
            <button className="play-button" aria-label={session.isPlaying ? "Pause" : "Play"} title={session.isPlaying ? "Pause" : "Play"} disabled={!session.canPlay && !session.canPause} onClick={() => props.onControl("togglePlayPause")}>{session.isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button>
            <button className="media-button" aria-label="Next track" title="Next" disabled={!session.canGoNext} onClick={() => props.onControl("next")}><SkipForward size={17} fill="currentColor" /></button>
          </div>
        </div>
      </div>
    ) : (
      <div className="idle-expanded"><div className="idle-clock-card"><Clock3 size={20} /><strong>{formatTime(props.now)}</strong></div><div className="idle-summary"><div className="idle-summary-row"><CalendarDays size={16} /><span>{formatDate(props.now)}</span></div>{props.power && <div className="idle-summary-row" data-low={props.power.low}><BatteryIcon percent={props.power.percent} charging={props.power.charging} /><span>{props.power.percent}%{props.power.charging ? " - Charging" : ""}</span></div>}<p>{props.loading ? "Connecting to Windows media..." : "No active media"}</p></div></div>
    )}
  </>;
}
