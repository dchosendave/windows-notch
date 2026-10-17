import { useCallback, useEffect } from "react";

import type { HaminSettings } from "@/features/settings/settings-schema";
import type { Announce } from "@/shared/hooks/use-transient-activity";

const MAX_ITEMS = 8;
const MAX_LENGTH = 300;

type UpdateSetting = <Key extends keyof HaminSettings>(key: Key, value: HaminSettings[Key]) => Promise<void>;

/** Explicit clipboard capture with expiry. Hamin never monitors the clipboard on its own. */
export function useClipboardHistory(settings: HaminSettings, updateSetting: UpdateSetting, announce: Announce) {
  const capture = useCallback(async () => {
    if (!settings.clipboardHistoryEnabled) {
      announce("Clipboard history is disabled", 2_400, { category: "clipboard", priority: "normal" });
      return;
    }
    try {
      const text = (await navigator.clipboard.readText()).trim().slice(0, MAX_LENGTH);
      if (!text) return announce("Clipboard is empty");
      const history = [text, ...settings.clipboardHistory.filter((item) => item !== text)].slice(0, MAX_ITEMS);
      await updateSetting("clipboardHistory", history);
      await updateSetting("clipboardCapturedAt", Date.now());
      announce("Clipboard captured", 1_800, { category: "clipboard" });
    } catch { announce("Clipboard access needs a click permission", 2_400, { category: "clipboard" }); }
  }, [announce, settings.clipboardHistory, settings.clipboardHistoryEnabled, updateSetting]);

  const copy = useCallback(async (value: string) => {
    try { await navigator.clipboard.writeText(value); announce("Copied", 1_400, { category: "clipboard", rateKey: "clipboard-copy" }); }
    catch { announce("Could not copy that item"); }
  }, [announce]);

  useEffect(() => {
    if (!settings.clipboardHistory.length || !settings.clipboardExpiryMinutes || !settings.clipboardCapturedAt) return;
    const remaining = settings.clipboardCapturedAt + settings.clipboardExpiryMinutes * 60_000 - Date.now();
    if (remaining <= 0) { void updateSetting("clipboardHistory", []); return; }
    const timer = window.setTimeout(() => void updateSetting("clipboardHistory", []), remaining);
    return () => window.clearTimeout(timer);
  }, [settings.clipboardCapturedAt, settings.clipboardExpiryMinutes, settings.clipboardHistory.length, updateSetting]);

  return { capture, copy };
}
