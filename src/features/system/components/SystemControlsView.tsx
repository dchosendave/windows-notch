import { Bluetooth, Camera, ChevronLeft, Headphones, Mic, RefreshCw, SunMedium, Volume2, VolumeX, Wifi } from "lucide-react";
import type { QuickAction } from "@/features/tasks/use-quick-actions";

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
        <button className="icon-button" aria-label="Back to Hamin" title="Back" onClick={props.onBack}><ChevronLeft size={16} /></button>
        <div className="settings-title"><strong>System controls</strong><small>Windows audio and devices</small></div>
        <button className="icon-button settings-collapse" aria-label="Refresh audio" title="Refresh" disabled={props.loading} onClick={props.onRefresh}><RefreshCw className={props.loading ? "spin" : ""} size={14} /></button>
      </header>
      <div className="volume-card">
        <button className="volume-button" aria-label={props.muted ? "Unmute" : "Mute"} onClick={props.onToggleMute}>{props.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
        <div className="volume-copy">
          <div><strong>Master volume</strong><span>{props.muted ? "Muted" : `${props.volume}%`}</span></div>
          <input className="system-slider" type="range" min={0} max={100} value={props.volume} aria-label="Master volume" onChange={(event) => props.onVolumeChange(Number(event.target.value))} />
        </div>
      </div>
      <button className="audio-output-row" onClick={() => props.onLaunch("sound")}><Headphones size={17} /><span><strong>{props.deviceName}</strong><small>{props.deviceCount} output device{props.deviceCount === 1 ? "" : "s"}</small></span><em>Change</em></button>
      <div className="system-links">
        <button onClick={() => props.onLaunch("wifi")}><Wifi size={17} /><span>Wi-Fi</span></button>
        <button onClick={() => props.onLaunch("bluetooth")}><Bluetooth size={17} /><span>Bluetooth</span></button>
        <button onClick={() => props.onLaunch("display")}><SunMedium size={17} /><span>Display</span></button>
        <button onClick={() => props.onLaunch("microphonePrivacy")}><Mic size={17} /><span>Microphone</span></button>
        <button onClick={() => props.onLaunch("cameraPrivacy")}><Camera size={17} /><span>Camera</span></button>
      </div>
      {props.error && <p className="settings-error">{props.error}</p>}
    </div>
  );
}
