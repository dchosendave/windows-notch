import type { HaminCommand } from "@/features/command/components/CommandPalette";
import type { HaminSettings } from "@/features/settings/settings-schema";
import type { QuickAction } from "@/features/tasks/use-quick-actions";
import type { Announce } from "@/shared/hooks/use-transient-activity";
import { nativeClient } from "@/shared/native/native-client";

type CommandDeps = {
  customActions: HaminSettings["customActions"];
  announce: Announce;
  collapse: () => void;
  openFiles: () => void;
  openSystem: () => void;
  startTimer: (minutes: number) => void;
  captureClipboard: () => Promise<void>;
  launchQuickAction: (action: QuickAction) => Promise<void>;
};

export function buildHaminCommands(deps: CommandDeps): HaminCommand[] {
  const { announce, collapse } = deps;
  const showPerformance = () => void nativeClient.getProcessMetrics()
    .then((metrics) => announce(`${metrics.memoryMb.toFixed(1)} MB · ${Math.floor(metrics.uptimeSeconds / 60)} min uptime`))
    .catch((error) => announce(String(error)));

  return [
    { id: "files", label: "Drop & act", description: "Preview held files and copy text or paths", icon: "clipboard", run: deps.openFiles },
    { id: "audio", label: "System audio", description: "Volume, mute, and device settings", icon: "volume", run: deps.openSystem },
    { id: "timer", label: "Start focus timer", description: "Begin a 25-minute focus session", icon: "timer", run: () => { deps.startTimer(25); collapse(); } },
    { id: "clipboard", label: "Capture clipboard", description: "Save the current clipboard text", icon: "clipboard", run: () => void deps.captureClipboard() },
    { id: "explorer", label: "Open File Explorer", description: "Launch Windows File Explorer", icon: "windows", run: () => void deps.launchQuickAction("explorer") },
    { id: "settings", label: "Open Windows Settings", description: "Launch the Windows Settings app", icon: "windows", run: () => void deps.launchQuickAction("settings") },
    { id: "performance", label: "Hamin performance", description: "Show current memory use and uptime", icon: "diagnostics", run: showPerformance },
    ...deps.customActions.map((action) => ({
      id: `custom-${action.id}`,
      label: action.label,
      description: action.target,
      icon: "windows" as const,
      run: () => void nativeClient.launchCustomTarget(action.target).then(collapse).catch((error) => announce(String(error))),
    })),
  ];
}
