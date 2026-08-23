import { useEffect, useRef } from "react";
import type { MediaSession } from "@/features/media/media-schema";
import type { PowerState } from "@/features/power/power-schema";
import type { Announce, AnnounceSequence } from "@/shared/hooks/use-transient-activity";

export function useCompanionEvents({ session, power, audioDevice, revealTrack, announce, announceSequence }: {
  session: MediaSession | null;
  power: PowerState;
  audioDevice: string;
  revealTrack: boolean;
  announce: Announce;
  announceSequence: AnnounceSequence;
}) {
  const previousTrack = useRef<string | null>(null);
  const previousPlaying = useRef(false);
  const previousPower = useRef<string | null>(null);
  const previousAudioDevice = useRef<string | null>(null);

  useEffect(() => {
    const trackKey = session ? `${session.sourceAppId}\u001f${session.title}\u001f${session.artist}` : null;
    const playbackStarted = Boolean(session?.isPlaying && !previousPlaying.current);
    if (trackKey && session?.isPlaying && (trackKey !== previousTrack.current || playbackStarted)) {
      previousTrack.current = trackKey;
      if (revealTrack) announceSequence([
        { message: "Now playing", duration: 650 },
        { message: session.title || "Unknown title", duration: 1_450 },
        ...(session.artist ? [{ message: session.artist, duration: 850 }] : []),
      ], { category: "media", priority: "low", group: "now-playing" });
    } else if (!trackKey) previousTrack.current = null;
    previousPlaying.current = session?.isPlaying ?? false;
  }, [announceSequence, revealTrack, session]);

  useEffect(() => {
    const key = power ? `${power.low}-${power.charging}` : null;
    if (previousPower.current !== null && key !== previousPower.current) {
      if (power?.low) announce(`Battery low · ${power.percent}%`, 4_000, { category: "power", priority: "high" });
      else if (power?.charging) announce(`Charging · ${power.percent}%`, 2_400, { category: "power" });
    }
    previousPower.current = key;
  }, [announce, power]);

  useEffect(() => {
    if (previousAudioDevice.current && previousAudioDevice.current !== audioDevice) announce(audioDevice, 2_800, { category: "device", detail: "Audio output changed" });
    previousAudioDevice.current = audioDevice;
  }, [announce, audioDevice]);

  useEffect(() => {
    const online = () => announce("Network connected", 1_800, { category: "network", rateKey: "network" });
    const offline = () => announce("Network disconnected", 4_000, { category: "network", priority: "high", rateKey: "network" });
    window.addEventListener("online", online); window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, [announce]);
}
