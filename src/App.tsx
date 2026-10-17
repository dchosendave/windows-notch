import { useCallback, useEffect, type CSSProperties } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { buildHaminCommands } from "@/features/command/hamin-commands";
import { useClipboardHistory } from "@/features/command/use-clipboard-history";
import { useFileShelf } from "@/features/command/use-file-shelf";
import { useForegroundContext } from "@/features/companion/use-foreground-context";
import { useArtworkAccent } from "@/features/media/use-artwork-accent";
import { useMediaSession } from "@/features/media/use-media-session";
import { CollapsedNotch } from "@/features/notch/components/CollapsedNotch";
import { NotchViews } from "@/features/notch/components/NotchViews";
import { getMotionProfile } from "@/features/notch/motion-profile";
import { viewDirection } from "@/features/notch/notch-logic";
import { useCompanionEvents } from "@/features/notch/use-companion-events";
import { useFollowActiveMonitor } from "@/features/notch/use-follow-active-monitor";
import { useNotchController, useNotchLayout } from "@/features/notch/use-notch-controller";
import { useNotchTheme } from "@/features/notch/use-notch-theme";
import { OnboardingView } from "@/features/onboarding/OnboardingView";
import { usePowerState } from "@/features/power/use-power-state";
import { useFocusTimer } from "@/features/productivity/use-focus-timer";
import type { HaminSettings } from "@/features/settings/settings-schema";
import { useSettings } from "@/features/settings/use-settings";
import { useAudio } from "@/features/system/use-audio";
import { useAudioLevels } from "@/features/system/use-audio-levels";
import { useQuickActions, type QuickAction } from "@/features/tasks/use-quick-actions";
import { useMinuteClock } from "@/shared/hooks/use-minute-clock";
import { usePrevious } from "@/shared/hooks/use-previous";
import { useTransientActivity, type CapsuleCategory } from "@/shared/hooks/use-transient-activity";
import { HAMIN_ERROR_EVENT, type AppError } from "@/shared/lib/report-error";
import { viewVariants } from "@/shared/motion/tokens";
import "./App.css";

function App() {
  const notch = useNotchController();
  const { expanded, mode, expand, collapse, openView, setMode } = notch;
  const now = useMinuteClock();
  const power = usePowerState();
  const media = useMediaSession();
  const quickActions = useQuickActions();
  const audio = useAudio();
  const { activity, capsule, history, dismissHistory, clearHistory, announce, announceSequence, setEnabledCategories, setMinimumPriority } = useTransientActivity();

  const focusTimer = useFocusTimer(useCallback(() => {
    announce("Timer complete", 5_000, { category: "timer", priority: "high" });
    expand("click");
  }, [announce, expand]));
  const { settings, ready: settingsReady, error: settingsError, updateSetting } = useSettings(useCallback(() => {
    setMode("command");
    expand("click");
  }, [expand, setMode]));
  const fileShelf = useFileShelf(useCallback((count: number) => {
    announce(`${count} ${count === 1 ? "item" : "items"} on shelf`, 3_000, { category: "device", priority: "normal" });
    setMode("files");
    expand("click");
  }, [announce, expand, setMode]), settings.fileShelfPersistence);
  const foreground = useForegroundContext(settings.contextAwareness && expanded && mode === "companion");
  const clipboard = useClipboardHistory(settings, updateSetting, announce);
  const audioLevels = useAudioLevels(settings.audioVisualization === "reactive" && Boolean(media.session?.isPlaying));
  const artworkAccent = useArtworkAccent(media.session?.artworkDataUrl, settings.accent === "artwork");
  const themeStyle = useNotchTheme(settings, artworkAccent);
  const hasCollapsedActivity = Boolean(activity || focusTimer.active || (settings.collapsedLayout === "track" && media.session));
  const { onboarding, targetSize } = useNotchLayout(notch, hasCollapsedActivity);
  const previousMode = usePrevious(mode);

  useFollowActiveMonitor(settings.followActiveMonitor, announce);
  useCompanionEvents({ session: media.session, power, audioDevice: audio.state.deviceName, revealTrack: settings.revealOnTrackChange, announce, announceSequence });

  useEffect(() => {
    const categories = (Object.entries(settings.capsuleCategories) as Array<[CapsuleCategory, boolean]>).filter(([, enabled]) => enabled).map(([category]) => category);
    setEnabledCategories(categories);
  }, [setEnabledCategories, settings.capsuleCategories]);
  useEffect(() => setMinimumPriority(settings.capsuleMinimumPriority), [setMinimumPriority, settings.capsuleMinimumPriority]);
  useEffect(() => {
    const showError = (event: Event) => announce((event as CustomEvent<AppError>).detail.message, 4_000, { category: "general", priority: "high", rateKey: "operational-error" });
    window.addEventListener(HAMIN_ERROR_EVENT, showError);
    return () => window.removeEventListener(HAMIN_ERROR_EVENT, showError);
  }, [announce]);

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
  const changeSetting = <Key extends keyof HaminSettings>(key: Key, value: HaminSettings[Key]) => void updateSetting(key, value);

  const commands = buildHaminCommands({
    customActions: settings.customActions,
    announce,
    collapse,
    openFiles: () => openView("files"),
    openSystem: () => openView("system"),
    startTimer,
    captureClipboard: clipboard.capture,
    launchQuickAction,
  });

  const motionProfile = getMotionProfile(settings);
  const animated = settings.animations && settings.motionStyle !== "instant";
  const direction = viewDirection(mode, previousMode ?? mode);

  return (
    <MotionConfig reducedMotion={animated ? "user" : "always"}>
      <main className="notch-stage" data-file-dragging={fileShelf.dragging} data-animations={animated} data-density={settings.density} data-operating-mode={settings.operatingMode} data-surface={settings.surfaceStyle} style={{ ...themeStyle, "--motion-content-duration": `${motionProfile.contentDuration}s` } as CSSProperties}>
        <span className="sr-only" role="status" aria-live="polite">{activity ?? ""}</span>
        <motion.section
          aria-label="Hamin notch"
          className="notch"
          data-expanded={expanded}
          data-attached={notch.attached}
          data-mode={mode}
          data-playing={media.session?.isPlaying ?? false}
          data-resizing={notch.resizing}
          {...notch.surfaceHandlers}
          onWheel={(event) => {
            notch.armInactivity();
            if (!expanded && settings.wheelVolume) {
              event.preventDefault();
              void changeVolume(Math.max(0, Math.min(100, audio.state.volume + (event.deltaY < 0 ? 3 : -3))));
            }
          }}
          onAuxClick={(event) => {
            if (!expanded && event.button === 1 && settings.middleClickPlayPause) {
              event.preventDefault();
              void media.control("togglePlayPause");
            }
          }}
          initial={false}
          animate={targetSize}
          transition={{ duration: motionProfile.duration, ease: motionProfile.ease }}
        >
          <AnimatePresence initial={false} mode="sync">
            {expanded ? (
              <motion.div key="expanded" className="expanded-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: motionProfile.contentDuration }}>
                {onboarding ? <OnboardingView onFinish={() => void updateSetting("onboardingComplete", true)} /> : (
                  <AnimatePresence initial={false} mode="popLayout" custom={direction}>
                    <motion.div key={mode} custom={direction} variants={viewVariants} initial="enter" animate="center" exit="exit" className="view-motion-shell" transition={{ duration: motionProfile.contentDuration }}>
                      <NotchViews
                        notch={notch}
                        settings={settings}
                        settingsReady={settingsReady}
                        settingsError={settingsError}
                        onChangeSetting={changeSetting}
                        now={now}
                        power={power}
                        media={media}
                        audio={audio}
                        onVolumeChange={(volume) => void changeVolume(volume)}
                        onToggleMute={() => void toggleMute()}
                        focusTimer={focusTimer}
                        onStartTimer={startTimer}
                        onStopTimer={stopTimer}
                        fileShelf={fileShelf}
                        foreground={foreground}
                        history={history}
                        onDismissHistory={dismissHistory}
                        onClearHistory={clearHistory}
                        commands={commands}
                        clipboard={clipboard}
                        launchQuickAction={launchQuickAction}
                        announce={announce}
                      />
                    </motion.div>
                  </AnimatePresence>
                )}
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
