import { useCallback } from "react";
import { reportOperationalError } from "@/shared/lib/report-error";
import { nativeClient } from "@/shared/native/native-client";

export type QuickAction = "explorer" | "search" | "settings" | "taskManager" | "calculator" | "wifi" | "bluetooth" | "display" | "sound" | "microphonePrivacy" | "cameraPrivacy" | "calendar";

export function useQuickActions() {
  const launch = useCallback(async (action: QuickAction) => {
    try {
      await nativeClient.launchQuickAction(action);
      return true;
    } catch (error) {
      reportOperationalError("Could not open that Windows action", error, "quick-actions");
      return false;
    }
  }, []);
  return { launch };
}
