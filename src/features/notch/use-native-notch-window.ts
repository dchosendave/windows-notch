import { useCallback, useRef, useState } from "react";
import { useSettingsStore } from "@/features/settings/settings-store";
import { getMotionProfile } from "./motion-profile";
import type { NotchSize } from "./notch-geometry";
import { nativeClient } from "@/shared/native/native-client";
import { reportOperationalError } from "@/shared/lib/report-error";

export function useNativeNotchWindow() {
  const [resizing, setResizing] = useState(false);
  const sequence = useRef(0);

  const resize = useCallback((size: NotchSize, floatingOffset: number) => {
    const settings = useSettingsStore.getState().settings;
    const motionStyle = settings.animations ? settings.motionStyle : "instant";
    const durationMs = getMotionProfile(settings).durationMs;
    const request = ++sequence.current;
    setResizing(durationMs > 0);
    void nativeClient.resizeNotch({ ...size, durationMs, floatingOffset, motionStyle })
      .catch((error) => reportOperationalError("Unable to resize Hamin", error, "window"))
      .finally(() => { if (sequence.current === request) setResizing(false); });
  }, []);

  return { resizing, resize };
}
