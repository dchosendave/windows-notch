import { useCallback, useEffect, useState } from "react";
import { nativeClient, type ForegroundContext } from "@/shared/native/native-client";

export function useForegroundContext(enabled: boolean) {
  const [context, setContext] = useState<ForegroundContext | null>(null);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    try { setContext(await nativeClient.getForegroundContext()); } catch { setContext(null); }
  }, [enabled]);
  useEffect(() => {
    if (!enabled) { setContext(null); return; }
    void refresh();
    const timer = window.setInterval(refresh, 2_500);
    return () => window.clearInterval(timer);
  }, [enabled, refresh]);
  return { context, refresh };
}
