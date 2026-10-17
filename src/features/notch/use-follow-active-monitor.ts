import { useEffect } from "react";
import type { Announce } from "@/shared/hooks/use-transient-activity";
import { nativeClient } from "@/shared/native/native-client";

const FOLLOW_INTERVAL_MS = 1_500;

/** Moves the notch to the monitor that holds the foreground window. */
export function useFollowActiveMonitor(enabled: boolean, announce: Announce) {
  useEffect(() => {
    if (!enabled) return;
    let inFlight = false;
    const follow = () => {
      if (inFlight) return;
      inFlight = true;
      void nativeClient.followForegroundMonitor()
        .catch((error) => announce(String(error), 3_000, { rateKey: "follow-monitor" }))
        .finally(() => { inFlight = false; });
    };
    follow();
    const timer = window.setInterval(follow, FOLLOW_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [announce, enabled]);
}
