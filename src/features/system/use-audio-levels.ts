import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { reportOperationalError } from "@/shared/lib/report-error";
import { nativeClient } from "@/shared/native/native-client";
import { z } from "zod";

type AudioLevelsEvent = { levels: number[] };
const audioLevelsSchema = z.object({ levels: z.array(z.number().finite().min(0).max(1)).length(5) });
const SILENT = [0, 0, 0, 0, 0];

export function useAudioLevels(enabled: boolean) {
  const [levels, setLevels] = useState(SILENT);

  useEffect(() => {
    if (!enabled) {
      setLevels(SILENT);
      void nativeClient.stopAudioVisualizer();
      return;
    }

    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<AudioLevelsEvent>("audio-levels", ({ payload }) => {
      if (disposed) return;
      const parsed = audioLevelsSchema.safeParse(payload);
      if (!parsed.success) {
        reportOperationalError("Invalid audio visualization update", parsed.error);
        return;
      }
      setLevels((current) => parsed.data.levels.map((level, index) => {
        const previous = current[index] ?? 0;
        const smoothing = level > previous ? 0.68 : 0.28;
        return previous + (level - previous) * smoothing;
      }));
    }).then((remove) => {
      if (disposed) remove();
      else unlisten = remove;
    }).catch((error) => reportOperationalError("Audio visualization listener is unavailable", error));
    void nativeClient.startAudioVisualizer().catch((error) => reportOperationalError("Audio visualization is unavailable", error));

    return () => {
      disposed = true;
      unlisten?.();
      void nativeClient.stopAudioVisualizer();
    };
  }, [enabled]);

  return levels;
}
