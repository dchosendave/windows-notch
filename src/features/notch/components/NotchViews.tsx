import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import type { HaminCommand } from "@/features/command/components/CommandPalette";
import type { useFileShelf } from "@/features/command/use-file-shelf";
import type { useForegroundContext } from "@/features/companion/use-foreground-context";
import { useMediaTimeline } from "@/features/media/use-media-timeline";
import type { useMediaSession } from "@/features/media/use-media-session";
import { AdaptiveActions } from "@/features/notch/components/AdaptiveActions";
import { DashboardView } from "@/features/notch/components/DashboardView";
import type { NotchController } from "@/features/notch/use-notch-controller";
import type { PowerState } from "@/features/power/power-schema";
import type { useFocusTimer } from "@/features/productivity/use-focus-timer";
import type { MonitorSummary } from "@/features/settings/components/SettingsView";
import type { HaminSettings } from "@/features/settings/settings-schema";
import type { useAudio } from "@/features/system/use-audio";
import type { QuickAction } from "@/features/tasks/use-quick-actions";
import type { Announce, Capsule } from "@/shared/hooks/use-transient-activity";
import { nativeClient, type ProcessMetrics } from "@/shared/native/native-client";

const SettingsView = lazy(() => import("@/features/settings/components/SettingsView").then((module) => ({ default: module.SettingsView })));
const CommandPalette = lazy(() => import("@/features/command/components/CommandPalette").then((module) => ({ default: module.CommandPalette })));
const FileShelfView = lazy(() => import("@/features/command/components/FileShelfView").then((module) => ({ default: module.FileShelfView })));
const CompanionView = lazy(() => import("@/features/companion/components/CompanionView").then((module) => ({ default: module.CompanionView })));
const FocusTimerView = lazy(() => import("@/features/productivity/components/FocusTimerView").then((module) => ({ default: module.FocusTimerView })));
const SystemControlsView = lazy(() => import("@/features/system/components/SystemControlsView").then((module) => ({ default: module.SystemControlsView })));

type NotchViewsProps = {
  notch: NotchController;
  settings: HaminSettings;
  settingsReady: boolean;
  settingsError: string | null;
  onChangeSetting: <Key extends keyof HaminSettings>(key: Key, value: HaminSettings[Key]) => void;
  now: Date;
  power: PowerState;
  media: ReturnType<typeof useMediaSession>;
  audio: ReturnType<typeof useAudio>;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  focusTimer: ReturnType<typeof useFocusTimer>;
  onStartTimer: (minutes: number) => void;
  onStopTimer: () => void;
  fileShelf: ReturnType<typeof useFileShelf>;
  foreground: ReturnType<typeof useForegroundContext>;
  history: Capsule[];
  onDismissHistory: (id: number) => void;
  onClearHistory: () => void;
  commands: HaminCommand[];
  clipboard: { capture: () => Promise<void>; copy: (value: string) => Promise<void> };
  launchQuickAction: (action: QuickAction) => Promise<void>;
  announce: Announce;
};

function Loading({ label, children }: { label: string; children: ReactNode }) {
  return <Suspense fallback={<div className="view-loading">Loading {label}…</div>}>{children}</Suspense>;
}

/** Routes the expanded notch to the view for the current mode. */
export function NotchViews(props: NotchViewsProps) {
  const { notch, settings, media, audio, focusTimer, fileShelf, announce } = props;
  const { mode, collapse, openView } = notch;
  const timeline = useMediaTimeline(media.session, media.seek);
  const [monitors, setMonitors] = useState<MonitorSummary[]>([]);
  const [metrics, setMetrics] = useState<ProcessMetrics | null>(null);
  const refreshMetrics = () => void nativeClient.getProcessMetrics().then(setMetrics).catch((error) => announce(String(error)));
  const closeUtilityView = () => notch.setMode(media.session ? "media" : "idle");
  const reportError = (error: unknown) => announce(String(error));

  // Each view loads what it shows when it opens.
  useEffect(() => {
    if (mode === "settings") void nativeClient.listMonitors<MonitorSummary>().then(setMonitors).catch(reportError);
    else if (mode === "companion") refreshMetrics();
    else if (mode === "system") void audio.refresh();
    // Only re-run when the view changes.
  }, [mode]);

  switch (mode) {
    case "files":
      return <Loading label="files"><FileShelfView files={fileShelf.files} onBack={closeUtilityView} onRemove={fileShelf.remove} onClear={fileShelf.clear} /></Loading>;
    case "settings":
      return <Loading label="settings"><SettingsView settings={settings} ready={props.settingsReady} error={props.settingsError} monitors={monitors} onBack={closeUtilityView} onCollapse={collapse} onChange={props.onChangeSetting} /></Loading>;
    case "command":
      return (
        <Loading label="commands">
          <CommandPalette
            commands={props.commands}
            note={settings.quickNote}
            clipboardHistory={settings.clipboardHistoryEnabled ? settings.clipboardHistory : []}
            shelfFiles={fileShelf.files}
            onClearShelf={fileShelf.clear}
            onRemoveFile={fileShelf.remove}
            onOpenFile={(path) => void nativeClient.launchCustomTarget(path).catch(reportError)}
            onRevealFile={(path) => void nativeClient.revealFile(path).catch(reportError)}
            onCopyFile={(path) => void navigator.clipboard.writeText(path).then(() => announce("Path copied"))}
            onBack={closeUtilityView}
            onNoteChange={(note) => props.onChangeSetting("quickNote", note)}
            onPasteCapture={() => void props.clipboard.capture()}
            onCopyHistory={(value) => void props.clipboard.copy(value)}
          />
        </Loading>
      );
    case "companion":
      return (
        <Loading label="companion">
          <CompanionView
            context={props.foreground.context}
            history={settings.notificationInbox ? props.history : []}
            metrics={metrics}
            onBack={closeUtilityView}
            onCollapse={collapse}
            onRefreshContext={() => void props.foreground.refresh()}
            onRefreshMetrics={refreshMetrics}
            onDismiss={props.onDismissHistory}
            onClear={props.onClearHistory}
            onOpenPrivacy={() => void props.launchQuickAction("microphonePrivacy")}
            onOpenCalendar={() => void props.launchQuickAction("calendar")}
          />
        </Loading>
      );
    case "system":
      return (
        <Loading label="audio">
          <SystemControlsView
            volume={audio.state.volume}
            muted={audio.state.muted}
            deviceName={audio.state.deviceName}
            deviceCount={audio.state.deviceCount}
            loading={audio.loading}
            error={audio.error}
            onBack={closeUtilityView}
            onRefresh={() => void audio.refresh()}
            onToggleMute={props.onToggleMute}
            onVolumeChange={props.onVolumeChange}
            onLaunch={(action) => void props.launchQuickAction(action)}
          />
        </Loading>
      );
    case "productivity":
      return (
        <Loading label="timer">
          <FocusTimerView
            now={props.now}
            timerEndsAt={focusTimer.endsAt}
            timerActive={focusTimer.active}
            paused={focusTimer.paused}
            remaining={focusTimer.remaining}
            duration={focusTimer.duration}
            presets={settings.focusPresets}
            completedThisWeek={focusTimer.completedThisWeek}
            onBack={closeUtilityView}
            onCollapse={collapse}
            onStart={props.onStartTimer}
            onStop={props.onStopTimer}
            onPause={focusTimer.pause}
            onResume={focusTimer.resume}
          />
        </Loading>
      );
    case "idle":
    case "media": {
      // On the dashboard, the timer action opens the timer view instead of starting 25 minutes.
      const adaptiveCommands = props.commands.map((command) => command.id === "timer"
        ? { ...command, label: "Focus timer", description: "Start or manage a focus session", run: () => openView("productivity") }
        : command);
      return (
        <DashboardView
          adaptiveActions={settings.contextAwareness && <AdaptiveActions commands={adaptiveCommands} pinned={settings.pinnedContext} onPin={(value) => props.onChangeSetting("pinnedContext", value)} />}
          session={media.session}
          sessions={media.sessions}
          loading={media.loading}
          power={props.power}
          now={props.now}
          displayedPosition={timeline.displayedPosition}
          timelineStyle={timeline.timelineStyle}
          onSeekPreview={timeline.onSeekPreview}
          onCommitSeek={timeline.onCommitSeek}
          onControl={(action) => void media.control(action)}
          onSelectSession={(sourceAppId) => void media.selectSession(sourceAppId)}
          onOpenCompanion={() => openView("companion")}
          onOpenProductivity={() => openView("productivity")}
          onOpenSystem={() => openView("system")}
          onOpenSettings={() => openView("settings")}
          onOpenCommand={() => openView("command")}
          onCollapse={collapse}
        />
      );
    }
  }
}
