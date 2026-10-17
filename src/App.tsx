import { type CSSProperties, lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import type { HaminCommand } from "@/features/command/components/CommandPalette";
import { useForegroundContext } from "@/features/companion/use-foreground-context";
import { useFileShelf } from "@/features/command/use-file-shelf";
import { useMediaSession } from "@/features/media/use-media-session";
import { useArtworkAccent } from "@/features/media/use-artwork-accent";
import { useLivePosition } from "@/features/media/use-live-position";
import { CollapsedNotch } from "@/features/notch/components/CollapsedNotch";
import { DashboardView } from "@/features/notch/components/DashboardView";
import { AdaptiveActions } from "@/features/notch/components/AdaptiveActions";
import { useNotchStore, type NotchMode, type NotchPhase } from "@/features/notch/notch-store";
import { getMotionProfile } from "@/features/notch/motion-profile";
import { COLLAPSED_SIZES, VIEW_SIZES } from "@/features/notch/notch-geometry";
import { useCompanionEvents } from "@/features/notch/use-companion-events";
import { useNativeNotchWindow } from "@/features/notch/use-native-notch-window";
import { usePowerState } from "@/features/power/use-power-state";
import { OnboardingView } from "@/features/onboarding/OnboardingView";
import { useFocusTimer } from "@/features/productivity/use-focus-timer";
import type { MonitorSummary } from "@/features/settings/components/SettingsView";
import type { HaminSettings } from "@/features/settings/settings-schema";
import { useSettings } from "@/features/settings/use-settings";
import { useSettingsStore } from "@/features/settings/settings-store";
import { useAudio } from "@/features/system/use-audio";
import { useAudioLevels } from "@/features/system/use-audio-levels";
import { useQuickActions, type QuickAction } from "@/features/tasks/use-quick-actions";
import { useMinuteClock } from "@/shared/hooks/use-minute-clock";
import { useTransientActivity, type CapsuleCategory } from "@/shared/hooks/use-transient-activity";
import { HAMIN_ERROR_EVENT, type AppError } from "@/shared/lib/report-error";
import { viewVariants } from "@/shared/motion/tokens";
import { nativeClient, type ProcessMetrics } from "@/shared/native/native-client";
import "./App.css";

type ExpansionReason = "click" | "hover";
const SettingsView = lazy(() => import("@/features/settings/components/SettingsView").then((module) => ({ default: module.SettingsView })));
const CommandPalette = lazy(() => import("@/features/command/components/CommandPalette").then((module) => ({ default: module.CommandPalette })));
const FileShelfView = lazy(() => import("@/features/command/components/FileShelfView").then((module) => ({ default: module.FileShelfView })));
const CompanionView = lazy(() => import("@/features/companion/components/CompanionView").then((module) => ({ default: module.CompanionView })));
const FocusTimerView = lazy(() => import("@/features/productivity/components/FocusTimerView").then((module) => ({ default: module.FocusTimerView })));
const SystemControlsView = lazy(() => import("@/features/system/components/SystemControlsView").then((module) => ({ default: module.SystemControlsView })));
const MODE_ORDER: Record<NotchMode, number> = { idle: 0, media: 0, companion: 1, productivity: 2, system: 3, command: 4, files: 4, settings: 5 };

function clearTimer(timer: { current: number | undefined }) {
  if (timer.current !== undefined) {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  }
}

function isEditingElement(element: Element | null) {
  if (element instanceof HTMLInputElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLTextAreaElement) return true;
  const selectPart = element?.closest<HTMLElement>('[data-slot^="select-"]');
  if (!selectPart) return false;
  return selectPart.dataset.slot !== "select-trigger" || selectPart.hasAttribute("data-popup-open");
}

function App() {
  const phase = useNotchStore((state) => state.phase);
  const expanded = phase !== "collapsed";
  const resumePhase = useNotchStore((state) => state.resumePhase);
  const setPhase = useNotchStore((state) => state.setPhase);
  const lockInteraction = useNotchStore((state) => state.lockInteraction);
  const unlockInteraction = useNotchStore((state) => state.unlockInteraction);
  const mode = useNotchStore((state) => state.mode);
  const setMode = useNotchStore((state) => state.setMode);
  const now = useMinuteClock();
  const power = usePowerState();
  const media = useMediaSession();
  const quickActions = useQuickActions();
  const audio = useAudio();
  const livePosition = useLivePosition(media.session);
  const { activity, capsule, history, dismissHistory, clearHistory, announce, announceSequence, setEnabledCategories, setMinimumPriority } = useTransientActivity();
  const [monitors, setMonitors] = useState<MonitorSummary[]>([]);
  const [metrics, setMetrics] = useState<ProcessMetrics | null>(null);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const notchWindow = useNativeNotchWindow();
  const inactivityTimer = useRef<number | undefined>(undefined);
  const selectOpen = useRef(false);
  const pointerInside = useRef(false);
  const collapsedActivity = useRef(false);
  const previousMode = useRef(mode);

  const resizeNative = notchWindow.resize;

  const expand = useCallback((reason: ExpansionReason = "click") => {
    const shouldAttach = reason === "click";
    const nextPhase: NotchPhase = reason === "click" ? "attached" : reason === "hover" ? "hover-preview" : "temporary";
    setPhase(nextPhase);
    const currentSettings = useSettingsStore.getState().settings;
    const currentMode = useNotchStore.getState().mode;
    const size = currentSettings.contextAwareness && (currentMode === "idle" || currentMode === "media") ? { width: 460, height: 296 } : VIEW_SIZES[currentMode];
    resizeNative(size, shouldAttach ? 0 : currentSettings.floatingOffset);
  }, [resizeNative, setPhase]);

  const collapse = useCallback(() => {
    clearTimer(inactivityTimer);
    setPhase("collapsed");
    const currentSettings = useSettingsStore.getState().settings;
    const density = currentSettings.density;
    const collapsedSize = COLLAPSED_SIZES[density][collapsedActivity.current ? "activity" : "minimal"];
    resizeNative(collapsedSize, currentSettings.floatingOffset);
  }, [resizeNative, setPhase]);

  const focusTimer = useFocusTimer(useCallback(() => {
    announce("Timer complete", 5_000, { category: "timer", priority: "high" });
    expand("click");
  }, [announce, expand]));

  const handleGlobalShortcut = useCallback(() => {
    setMode("command");
    expand("click");
  }, [expand, setMode]);
  const { settings, ready: settingsReady, error: settingsError, updateSetting } = useSettings(handleGlobalShortcut);
  const handleFileDrop = useCallback((count: number) => {
    announce(`${count} ${count === 1 ? "item" : "items"} on shelf`, 3_000, { category: "device", priority: "normal" });
    setMode("files");
    expand("click");
  }, [announce, expand, setMode]);
  const fileShelf = useFileShelf(handleFileDrop, settings.fileShelfPersistence);
  const foreground = useForegroundContext(settings.contextAwareness && expanded && mode === "companion");
  useEffect(() => {
    const categories = (Object.entries(settings.capsuleCategories) as Array<[CapsuleCategory, boolean]>).filter(([, enabled]) => enabled).map(([category]) => category);
    setEnabledCategories(categories);
  }, [setEnabledCategories, settings.capsuleCategories]);
  useEffect(() => setMinimumPriority(settings.capsuleMinimumPriority), [setMinimumPriority, settings.capsuleMinimumPriority]);
  useEffect(() => {
    if (!settings.followActiveMonitor) return;
    let inFlight = false;
    const follow = () => {
      if (inFlight) return;
      inFlight = true;
      void nativeClient.followForegroundMonitor().catch((error) => announce(String(error), 3_000, { rateKey: "follow-monitor" })).finally(() => { inFlight = false; });
    };
    follow();
    const timer = window.setInterval(follow, 1_500);
    return () => window.clearInterval(timer);
  }, [announce, settings.followActiveMonitor]);
  useEffect(() => {
    const showError = (event: Event) => announce((event as CustomEvent<AppError>).detail.message, 4_000, { category: "general", priority: "high", rateKey: "operational-error" });
    window.addEventListener(HAMIN_ERROR_EVENT, showError);
    return () => window.removeEventListener(HAMIN_ERROR_EVENT, showError);
  }, [announce]);
  const audioLevels = useAudioLevels(settings.audioVisualization === "reactive" && Boolean(media.session?.isPlaying));
  const artworkAccent = useArtworkAccent(media.session?.artworkDataUrl, settings.accent === "artwork");
  useCompanionEvents({ session: media.session, power, audioDevice: audio.state.deviceName, revealTrack: settings.revealOnTrackChange, announce, announceSequence });
  const hasCollapsedActivity = Boolean(activity || focusTimer.active || (settings.collapsedLayout === "track" && media.session));
  collapsedActivity.current = hasCollapsedActivity;
  const collapsedSize = COLLAPSED_SIZES[settings.density][hasCollapsedActivity ? "activity" : "minimal"];
  const attached = phase === "attached" || (phase === "interaction-locked" && resumePhase === "attached");
  const onboarding = settingsReady && !settings.onboardingComplete;
  const expandedSize = onboarding ? { width: 460, height: 280 } : settings.contextAwareness && (mode === "idle" || mode === "media") ? { width: 460, height: 296 } : VIEW_SIZES[mode];

  useEffect(() => {
    if (expanded) {
      resizeNative(expandedSize, attached ? 0 : settings.floatingOffset);
    }
  }, [attached, expanded, expandedSize.height, expandedSize.width, resizeNative, settings.floatingOffset]);

  useEffect(() => {
    if (!expanded) resizeNative(collapsedSize, settings.floatingOffset);
  }, [collapsedSize.height, collapsedSize.width, expanded, resizeNative, settings.floatingOffset]);

  const armInactivity = useCallback(() => {
    clearTimer(inactivityTimer);
    if (useNotchStore.getState().phase === "collapsed" || settings.inactivityMs === 0 || useNotchStore.getState().phase !== "attached") return;
    const currentMode = useNotchStore.getState().mode;
    // Browsing commands, settings, system controls, or timers is an intentional
    // interaction. These views close through selection, Back, Escape, or focus loss.
    if (currentMode !== "idle" && currentMode !== "media") return;
    const activeElement = document.activeElement;
    if (isEditingElement(activeElement)) return;
    inactivityTimer.current = window.setTimeout(collapse, settings.inactivityMs);
  }, [collapse, settings.inactivityMs]);

  useEffect(() => {
    if (expanded) armInactivity();
    else clearTimer(inactivityTimer);
  }, [armInactivity, expanded, mode]);

  useEffect(() => {
    const handleSelectOpen = (event: Event) => {
      selectOpen.current = (event as CustomEvent<boolean>).detail;
      if (selectOpen.current) {
        lockInteraction();
        clearTimer(inactivityTimer);
      } else if (useNotchStore.getState().resumePhase === "hover-preview" && !pointerInside.current) collapse();
      else {
        unlockInteraction();
        inactivityTimer.current = window.setTimeout(armInactivity, 0);
      }
    };
    window.addEventListener("hamin-select-open", handleSelectOpen);
    return () => window.removeEventListener("hamin-select-open", handleSelectOpen);
  }, [armInactivity, collapse, lockInteraction, unlockInteraction]);

  const openView = (nextMode: NotchMode) => {
    clearTimer(inactivityTimer);
    setPhase("attached");
    setMode(nextMode);
  };

  const openSettings = () => {
    openView("settings");
    void nativeClient.listMonitors<MonitorSummary>().then(setMonitors).catch((error) => announce(String(error)));
  };
  const openSystem = () => { openView("system"); void audio.refresh(); };
  const openCommand = () => openView("command");
  const refreshMetrics = () => void nativeClient.getProcessMetrics().then(setMetrics).catch((error) => announce(String(error)));
  const openCompanion = () => { openView("companion"); refreshMetrics(); };
  const closeUtilityView = () => setMode(media.session ? "media" : "idle");

  const startTimer = (minutes: number) => {
    focusTimer.start(minutes);
    announce(`${minutes}-minute timer started`, 2_400, { category: "timer" });
  };
  const stopTimer = () => { focusTimer.stop(); announce("Timer stopped", 2_400, { category: "timer" }); };

  const changeVolume = async (volume: number) => {
    const next = await audio.setVolume(volume);
    if (next) announce(next.muted ? "Muted" : `Volume ${next.volume}%`, 1_000, { category: "audio", rateKey: "volume" });
  };
  const toggleMute = async () => {
    const next = await audio.toggleMute();
    if (next) announce(next.muted ? "Sound muted" : `Volume ${next.volume}%`, 1_200, { category: "audio", rateKey: "volume" });
  };
  const launchQuickAction = async (action: QuickAction) => { if (await quickActions.launch(action)) collapse(); };

  const captureClipboard = async () => {
    if (!settings.clipboardHistoryEnabled) {
      announce("Clipboard history is disabled", 2_400, { category: "clipboard", priority: "normal" });
      return;
    }
    try {
      const text = (await navigator.clipboard.readText()).trim().slice(0, 300);
      if (!text) return announce("Clipboard is empty");
      const history = [text, ...settings.clipboardHistory.filter((item) => item !== text)].slice(0, 8);
      await updateSetting("clipboardHistory", history);
      await updateSetting("clipboardCapturedAt", Date.now());
      announce("Clipboard captured", 1_800, { category: "clipboard" });
    } catch { announce("Clipboard access needs a click permission", 2_400, { category: "clipboard" }); }
  };
  const copyHistory = async (value: string) => {
    try { await navigator.clipboard.writeText(value); announce("Copied", 1_400, { category: "clipboard", rateKey: "clipboard-copy" }); }
    catch { announce("Could not copy that item"); }
  };

  const changeSetting = <Key extends keyof HaminSettings>(key: Key, value: HaminSettings[Key]) => void updateSetting(key, value);

  const commands: HaminCommand[] = [
    { id: "files", label: "Drop & act", description: "Preview held files and copy text or paths", icon: "clipboard", run: () => openView("files") },
    { id: "audio", label: "System audio", description: "Volume, mute, and device settings", icon: "volume", run: openSystem },
    { id: "timer", label: "Start focus timer", description: "Begin a 25-minute focus session", icon: "timer", run: () => { startTimer(25); collapse(); } },
    { id: "clipboard", label: "Capture clipboard", description: "Save the current clipboard text", icon: "clipboard", run: () => void captureClipboard() },
    { id: "explorer", label: "Open File Explorer", description: "Launch Windows File Explorer", icon: "windows", run: () => void launchQuickAction("explorer") },
    { id: "settings", label: "Open Windows Settings", description: "Launch the Windows Settings app", icon: "windows", run: () => void launchQuickAction("settings") },
    { id: "performance", label: "Hamin performance", description: "Show current memory use and uptime", icon: "diagnostics", run: () => void nativeClient.getProcessMetrics().then((metrics) => announce(`${metrics.memoryMb.toFixed(1)} MB · ${Math.floor(metrics.uptimeSeconds / 60)} min uptime`)).catch((error) => announce(String(error))) },
    ...settings.customActions.map((action) => ({ id: `custom-${action.id}`, label: action.label, description: action.target, icon: "windows" as const, run: () => void nativeClient.launchCustomTarget(action.target).then(collapse).catch((error) => announce(String(error))) })),
  ];

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void getCurrentWindow().onFocusChanged(({ payload }) => {
      const state = useNotchStore.getState();
      if (!payload && state.phase !== "collapsed") collapse();
    }).then((remove) => { unlisten = remove; });
    return () => unlisten?.();
  }, [collapse]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && useNotchStore.getState().phase !== "collapsed") collapse();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapse]);

  useEffect(() => () => { clearTimer(inactivityTimer); }, []);
  useEffect(() => setSeekPreview(null), [media.session?.sourceAppId, media.session?.title, media.session?.positionMs]);

  const onPointerEnter = () => {
    pointerInside.current = true;
    if (!expanded && settings.expandOnHover) expand("hover");
  };
  const onPointerLeave = () => {
    pointerInside.current = false;
    const state = useNotchStore.getState();
    if (state.phase === "hover-preview" && !selectOpen.current) collapse();
  };
  const commitSeek = async (positionMs: number) => {
    if (!media.session?.canSeek) return;
    if (!(await media.seek(positionMs))) setSeekPreview(null);
  };

  const displayedPosition = seekPreview ?? livePosition;
  const progress = media.session?.durationMs ? Math.min(100, displayedPosition / media.session.durationMs * 100) : 0;
  const timelineStyle = { "--timeline-progress": `${progress}%` } as CSSProperties;
  const accentColors = { blue: "106, 156, 255", violet: "173, 130, 255", emerald: "76, 201, 154", artwork: artworkAccent } as const;
  const themeStyle = { "--accent-rgb": accentColors[settings.accent], "--surface-opacity": settings.surfaceOpacity, "--notch-radius": `${settings.cornerRadius}px` } as CSSProperties;
  const targetSize = expanded ? expandedSize : collapsedSize;
  const motionProfile = getMotionProfile(settings);
  const viewDirection = MODE_ORDER[mode] >= MODE_ORDER[previousMode.current] ? 1 : -1;

  useEffect(() => { previousMode.current = mode; }, [mode]);

  useEffect(() => {
    if (onboarding && !expanded) expand("click");
  }, [expand, expanded, onboarding]);

  useEffect(() => {
    if (!settings.clipboardHistory.length || !settings.clipboardExpiryMinutes || !settings.clipboardCapturedAt) return;
    const remaining = settings.clipboardCapturedAt + settings.clipboardExpiryMinutes * 60_000 - Date.now();
    if (remaining <= 0) { void updateSetting("clipboardHistory", []); return; }
    const timer = window.setTimeout(() => void updateSetting("clipboardHistory", []), remaining);
    return () => window.clearTimeout(timer);
  }, [settings.clipboardCapturedAt, settings.clipboardExpiryMinutes, settings.clipboardHistory.length, updateSetting]);

  useEffect(() => {
    document.documentElement.style.setProperty("--accent-rgb", accentColors[settings.accent]);
    document.documentElement.dataset.density = settings.density;
  }, [settings.accent, settings.density]);

  return (
    <MotionConfig reducedMotion={settings.animations && settings.motionStyle !== "instant" ? "user" : "always"}>
      <main className="notch-stage" data-file-dragging={fileShelf.dragging} data-animations={settings.animations && settings.motionStyle !== "instant"} data-density={settings.density} data-operating-mode={settings.operatingMode} data-surface={settings.surfaceStyle} style={{ ...themeStyle, "--motion-content-duration": `${motionProfile.contentDuration}s` } as CSSProperties}>
        <span className="sr-only" role="status" aria-live="polite">{activity ?? ""}</span>
        <motion.section
          aria-label="Hamin notch"
          className="notch"
          data-expanded={expanded}
          data-attached={attached}
          data-mode={mode}
          data-playing={media.session?.isPlaying ?? false}
          data-resizing={notchWindow.resizing}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerMove={armInactivity}
          onPointerDown={armInactivity}
          onWheel={(event) => {
            armInactivity();
            if (!expanded && settings.wheelVolume) {
              event.preventDefault();
              const nextVolume = Math.max(0, Math.min(100, audio.state.volume + (event.deltaY < 0 ? 3 : -3)));
              void changeVolume(nextVolume);
            }
          }}
          onAuxClick={(event) => {
            if (!expanded && event.button === 1 && settings.middleClickPlayPause) {
              event.preventDefault();
              void media.control("togglePlayPause");
            }
          }}
          onKeyDown={armInactivity}
          onFocusCapture={(event) => {
            if (isEditingElement(event.target)) clearTimer(inactivityTimer);
            else armInactivity();
          }}
          onBlurCapture={() => {
            clearTimer(inactivityTimer);
            inactivityTimer.current = window.setTimeout(armInactivity, 0);
          }}
          initial={false}
          animate={targetSize}
          transition={{ duration: motionProfile.duration, ease: motionProfile.ease }}
        >
          <AnimatePresence initial={false} mode="sync">
            {expanded ? (
              <motion.div key="expanded" className="expanded-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: motionProfile.contentDuration }}>
                {onboarding ? <OnboardingView onFinish={() => void updateSetting("onboardingComplete", true)} /> : <AnimatePresence initial={false} mode="popLayout" custom={viewDirection}>
                  <motion.div key={mode} custom={viewDirection} variants={viewVariants} initial="enter" animate="center" exit="exit" className="view-motion-shell" transition={{ duration: motionProfile.contentDuration }}>
                {mode === "files" && <Suspense fallback={<div className="view-loading">Loading files…</div>}><FileShelfView files={fileShelf.files} onBack={closeUtilityView} onRemove={fileShelf.remove} onClear={fileShelf.clear} /></Suspense>}
                {mode === "settings" && <Suspense fallback={<div className="view-loading">Loading settings…</div>}><SettingsView settings={settings} ready={settingsReady} error={settingsError} monitors={monitors} onBack={closeUtilityView} onCollapse={collapse} onChange={changeSetting} /></Suspense>}
                {mode === "command" && <Suspense fallback={<div className="view-loading">Loading commands…</div>}><CommandPalette commands={commands} note={settings.quickNote} clipboardHistory={settings.clipboardHistoryEnabled ? settings.clipboardHistory : []} shelfFiles={fileShelf.files} onClearShelf={fileShelf.clear} onRemoveFile={fileShelf.remove} onOpenFile={(path) => void nativeClient.launchCustomTarget(path).catch((error) => announce(String(error)))} onRevealFile={(path) => void nativeClient.revealFile(path).catch((error) => announce(String(error)))} onCopyFile={(path) => void navigator.clipboard.writeText(path).then(() => announce("Path copied"))} onBack={closeUtilityView} onNoteChange={(note) => changeSetting("quickNote", note)} onPasteCapture={() => void captureClipboard()} onCopyHistory={(value) => void copyHistory(value)} /></Suspense>}
                {mode === "companion" && <Suspense fallback={<div className="view-loading">Loading companion…</div>}><CompanionView context={foreground.context} history={settings.notificationInbox ? history : []} metrics={metrics} onBack={closeUtilityView} onCollapse={collapse} onRefreshContext={() => void foreground.refresh()} onRefreshMetrics={refreshMetrics} onDismiss={dismissHistory} onClear={clearHistory} onOpenPrivacy={() => void launchQuickAction("microphonePrivacy")} onOpenCalendar={() => void launchQuickAction("calendar")} /></Suspense>}
                {mode === "system" && <Suspense fallback={<div className="view-loading">Loading audio…</div>}><SystemControlsView volume={audio.state.volume} muted={audio.state.muted} deviceName={audio.state.deviceName} deviceCount={audio.state.deviceCount} loading={audio.loading} error={audio.error} onBack={closeUtilityView} onRefresh={() => void audio.refresh()} onToggleMute={() => void toggleMute()} onVolumeChange={(volume) => void changeVolume(volume)} onLaunch={(action) => void launchQuickAction(action)} /></Suspense>}
                {mode === "productivity" && <Suspense fallback={<div className="view-loading">Loading timer…</div>}><FocusTimerView now={now} timerEndsAt={focusTimer.endsAt} timerActive={focusTimer.active} paused={focusTimer.paused} remaining={focusTimer.remaining} duration={focusTimer.duration} presets={settings.focusPresets} completedThisWeek={focusTimer.completedThisWeek} onBack={closeUtilityView} onCollapse={collapse} onStart={startTimer} onStop={stopTimer} onPause={focusTimer.pause} onResume={focusTimer.resume} /></Suspense>}
                {(mode === "idle" || mode === "media") && <DashboardView adaptiveActions={settings.contextAwareness && <AdaptiveActions commands={commands.map((command) => command.id === "timer" ? { ...command, label: "Focus timer", description: "Start or manage a focus session", run: () => openView("productivity") } : command)} pinned={settings.pinnedContext} onPin={(value) => changeSetting("pinnedContext", value)} />} session={media.session} sessions={media.sessions} loading={media.loading} power={power} now={now} displayedPosition={displayedPosition} timelineStyle={timelineStyle} onSeekPreview={setSeekPreview} onCommitSeek={(value) => void commitSeek(value)} onControl={(action) => void media.control(action)} onSelectSession={(sourceAppId) => void media.selectSession(sourceAppId)} onOpenCompanion={openCompanion} onOpenProductivity={() => openView("productivity")} onOpenSystem={openSystem} onOpenSettings={openSettings} onOpenCommand={openCommand} onCollapse={collapse} />}
                  </motion.div>
                </AnimatePresence>}
              </motion.div>
            ) : (
              <CollapsedNotch session={media.session} loading={media.loading} power={power} now={now} activity={activity} capsuleCategory={capsule?.category} capsulePriority={capsule?.priority} timerEndsAt={focusTimer.endsAt} timerRemaining={focusTimer.remaining} audioLevels={audioLevels} layout={settings.collapsedLayout} onExpand={() => expand("click")} />
            )}
          </AnimatePresence>
        </motion.section>
      </main>
    </MotionConfig>
  );
}

export default App;
