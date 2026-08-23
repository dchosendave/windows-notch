import { invoke } from "@tauri-apps/api/core";
import type { MediaAction } from "@/features/media/media-schema";
import type { QuickAction } from "@/features/tasks/use-quick-actions";

export type ResizeNotchRequest = { width: number; height: number; durationMs: number; floatingOffset: number; motionStyle: string };
export type PlacementRequest = { monitor: number; horizontalOffset: number; topOffset: number };
export type ProcessMetrics = { memoryMb: number; uptimeSeconds: number };

export const nativeClient = {
  resizeNotch: (request: ResizeNotchRequest) => invoke<void>("animate_notch_size", request),
  listMonitors: <T>() => invoke<T[]>("list_monitors"),
  setPlacement: (request: PlacementRequest) => invoke<void>("set_notch_placement", request),
  setTaskbarReplacement: (enabled: boolean) => invoke<void>("set_taskbar_replacement", { enabled }),
  getProcessMetrics: () => invoke<ProcessMetrics>("get_process_metrics"),
  getPowerState: () => invoke<unknown>("get_power_state"),
  launchQuickAction: (action: QuickAction) => invoke<void>("launch_quick_action", { action }),
  getAudioState: () => invoke<unknown>("get_audio_state"),
  setMasterVolume: (volume: number) => invoke<unknown>("set_master_volume", { volume: Math.round(volume) }),
  toggleMasterMute: () => invoke<unknown>("toggle_master_mute"),
  startAudioVisualizer: () => invoke<void>("start_audio_visualizer"),
  stopAudioVisualizer: () => invoke<void>("stop_audio_visualizer"),
  getMediaState: () => invoke<unknown>("get_media_state"),
  controlMedia: (action: MediaAction) => invoke<boolean>("control_media", { action }),
  seekMedia: (positionMs: number) => invoke<boolean>("seek_media", { positionMs: Math.max(0, Math.round(positionMs)) }),
  listMediaSessions: () => invoke<unknown>("list_media_sessions"),
  selectMediaSession: (sourceAppId: string) => invoke<void>("select_media_session", { sourceAppId }),
};
