import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { z } from "zod";
import { reportOperationalError } from "@/shared/lib/report-error";
import { nativeClient } from "@/shared/native/native-client";

const AUDIO_STATE_EVENT = "audio-state";

const audioStateSchema = z.object({
  volume: z.number().min(0).max(100),
  muted: z.boolean(),
  deviceName: z.string(),
  deviceCount: z.number().int().nonnegative(),
});

export function useAudio() {
  const [state, setState] = useState({ volume: 0, muted: false, deviceName: "Default audio device", deviceCount: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (operation: () => Promise<unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const next = audioStateSchema.parse(await operation());
      setState(next);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const apply = (value: unknown) => {
      const parsed = audioStateSchema.safeParse(value);
      if (!disposed && parsed.success) setState(parsed.data);
    };
    // The native watcher publishes every volume, mute, and device change.
    void listen(AUDIO_STATE_EVENT, ({ payload }) => apply(payload))
      .then((remove) => { if (disposed) remove(); else unlisten = remove; })
      .catch((cause) => reportOperationalError("Audio updates are unavailable", cause));
    void nativeClient.getAudioState().then(apply).catch(() => undefined);
    return () => { disposed = true; unlisten?.(); };
  }, []);

  return {
    state,
    loading,
    error,
    refresh: () => run(nativeClient.getAudioState),
    setVolume: (volume: number) => run(() => nativeClient.setMasterVolume(volume)),
    toggleMute: () => run(nativeClient.toggleMasterMute),
  };
}
