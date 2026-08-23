import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { nativeClient } from "@/shared/native/native-client";

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
    const refreshSilently = () => void nativeClient.getAudioState().then((value) => { if (!disposed) setState(audioStateSchema.parse(value)); }).catch(() => undefined);
    refreshSilently();
    const interval = window.setInterval(refreshSilently, 10_000);
    return () => { disposed = true; window.clearInterval(interval); };
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
