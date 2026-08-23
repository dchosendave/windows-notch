import { useCallback, useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

import { powerStateSchema } from "./power-schema";
import { reportOperationalError } from "@/shared/lib/report-error";
import { nativeClient } from "@/shared/native/native-client";

const POWER_STATE_EVENT = "power-state";

export function usePowerState() {
  const [power, setPowerState] = useState<ReturnType<typeof powerStateSchema.parse>>(null);
  const setPower = useCallback((next: ReturnType<typeof powerStateSchema.parse>) => setPowerState(next), []);

  useEffect(() => {
    let disposed = false;
    let removeListener: (() => void) | undefined;

    const connect = async () => {
      removeListener = await listen<unknown>(POWER_STATE_EVENT, (event) => {
        if (!disposed) setPower(powerStateSchema.parse(event.payload));
      });

      if (disposed) {
        removeListener();
        return;
      }

      try {
        const initialState = await nativeClient.getPowerState();
        if (!disposed) setPower(powerStateSchema.parse(initialState));
      } catch (error) {
        reportOperationalError("Power status is unavailable", error);
      }
    };

    void connect();
    return () => {
      disposed = true;
      removeListener?.();
    };
  }, [setPower]);

  return power;
}
