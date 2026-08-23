import { Bluetooth, Camera, ChevronLeft, Headphones, Mic, RefreshCw, SunMedium, Volume2, VolumeX, Wifi } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { QuickAction } from "@/features/tasks/use-quick-actions";
import { MotionButton } from "@/shared/motion/MotionButton";

type SystemControlsViewProps = {
  volume: number;
  muted: boolean;
  deviceName: string;
  deviceCount: number;
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onRefresh: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onLaunch: (action: QuickAction) => void;
};

export function SystemControlsView(props: SystemControlsViewProps) {
  return (
    <div className="system-view">
      <header className="expanded-header tasks-header">
        <MotionButton className="icon-button" aria-label="Back to Hamin" title="Back" onClick={props.onBack}><ChevronLeft size={16} /></MotionButton>
        <div className="settings-title"><strong>System controls</strong><small>Windows audio and devices</small></div>
        <MotionButton className="icon-button settings-collapse" aria-label="Refresh audio" title="Refresh" disabled={props.loading} onClick={props.onRefresh}><RefreshCw className={props.loading ? "spin" : ""} size={14} /></MotionButton>
      </header>
      <div className="volume-card">
        <MotionButton className="volume-button" aria-label={props.muted ? "Unmute" : "Mute"} onClick={props.onToggleMute}><AnimatePresence initial={false} mode="wait"><motion.span className="playback-icon" key={props.muted ? "muted" : "volume"} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} transition={{ duration: 0.12 }}>{props.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</motion.span></AnimatePresence></MotionButton>
        <div className="volume-copy">
          <div><strong>Master volume</strong><span>{props.muted ? "Muted" : `${props.volume}%`}</span></div>
          <input className="system-slider" type="range" min={0} max={100} value={props.volume} aria-label="Master volume" onChange={(event) => props.onVolumeChange(Number(event.target.value))} />
        </div>
      </div>
      <div className="audio-presets" aria-label="Volume profiles"><span>Audio profiles</span>{[{ label: "Quiet", value: 25 }, { label: "Balanced", value: 55 }, { label: "Loud", value: 80 }].map((preset) => <MotionButton key={preset.label} data-active={!props.muted && Math.abs(props.volume - preset.value) < 3} onClick={() => props.onVolumeChange(preset.value)}>{preset.label}</MotionButton>)}</div>
      <MotionButton className="audio-output-row" layout onClick={() => props.onLaunch("sound")}><Headphones size={17} /><span><AnimatePresence initial={false} mode="wait"><motion.strong key={props.deviceName} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.14 }}>{props.deviceName}</motion.strong></AnimatePresence><small>{props.deviceCount} output device{props.deviceCount === 1 ? "" : "s"}</small></span><em>Change</em></MotionButton>
      <div className="system-links">
        <MotionButton onClick={() => props.onLaunch("wifi")}><Wifi size={17} /><span>Wi-Fi</span></MotionButton>
        <MotionButton onClick={() => props.onLaunch("bluetooth")}><Bluetooth size={17} /><span>Bluetooth</span></MotionButton>
        <MotionButton onClick={() => props.onLaunch("display")}><SunMedium size={17} /><span>Display</span></MotionButton>
        <MotionButton onClick={() => props.onLaunch("microphonePrivacy")}><Mic size={17} /><span>Microphone</span></MotionButton>
        <MotionButton onClick={() => props.onLaunch("cameraPrivacy")}><Camera size={17} /><span>Camera</span></MotionButton>
      </div>
      {props.error && <p className="settings-error">{props.error}</p>}
    </div>
  );
}
