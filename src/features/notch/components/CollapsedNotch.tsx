import { type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Clipboard, Headphones, Music2, ShieldAlert, Timer, Volume2, WifiOff } from "lucide-react";
import type { MediaSession } from "@/features/media/media-schema";
import type { PowerState } from "@/features/power/power-schema";
import { BatteryIcon } from "@/features/power/BatteryIcon";
import { formatCountdown, formatTime } from "@/shared/lib/formatters";
import type { CapsuleCategory, CapsulePriority } from "@/shared/hooks/use-transient-activity";
import { motionTokens } from "@/shared/motion/tokens";

const capsuleIcons = { general: Bell, media: Music2, audio: Volume2, power: Bell, network: WifiOff, timer: Timer, clipboard: Clipboard, privacy: ShieldAlert, device: Headphones };

export function CollapsedNotch({ session, loading, power, now, activity, capsuleCategory, capsulePriority, timerEndsAt, timerRemaining, audioLevels, layout, onExpand }: {
  session: MediaSession | null;
  loading: boolean;
  power: PowerState;
  now: Date;
  activity: string | null;
  capsuleCategory?: CapsuleCategory;
  capsulePriority?: CapsulePriority;
  timerEndsAt: number | null;
  timerRemaining: number;
  audioLevels: number[];
  layout: "waves" | "track" | "battery" | "minimal";
  onExpand: () => void;
}) {
  const activityText = activity ?? (timerEndsAt ? `Timer ${formatCountdown(timerRemaining)}` : null);
  const showBattery = !activityText && power && (layout === "battery" || power.low || power.charging);
  const showTrack = !activityText && layout === "track" && session;
  const CapsuleIcon = capsuleCategory ? capsuleIcons[capsuleCategory] : null;
  const ariaStatus = activityText ?? (session ? `${session.isPlaying ? "Playing" : "Paused"}: ${session.title}` : loading ? "Connecting" : "Hamin ready");
  return (
    <motion.button key="collapsed" className="collapsed-content" data-activity={Boolean(activityText)} type="button" aria-label={`${ariaStatus}. Expand Hamin`} onClick={onExpand} initial={{ opacity: 0 }} animate={{ opacity: 1, transitionEnd: { transform: "none" } }} exit={{ opacity: 0 }} whileHover={{ backgroundColor: "rgba(255,255,255,0.025)" }} whileTap={{ opacity: 0.86 }} transition={motionTokens.spring.responsive}>
      <motion.span layoutId="notch-media-visual" className="collapsed-signal">
        <AnimatePresence initial={false} mode="wait">
          {activity && CapsuleIcon ? <motion.span key={`capsule-${capsuleCategory}`} className="capsule-signal" data-category={capsuleCategory} data-priority={capsulePriority} initial={{ opacity: 0, scale: 0.65, x: -3 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.7, x: 3 }} transition={capsulePriority === "high" ? motionTokens.spring.responsive : { duration: 0.14 }}><CapsuleIcon size={13} /></motion.span> : showBattery ? <motion.span key="battery" className="battery-signal" data-low={power.low} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><BatteryIcon percent={power.percent} charging={power.charging} /><small>{power.percent}</small></motion.span> : layout === "minimal" ? <motion.span key="minimal" className="minimal-signal" data-active={session?.isPlaying ?? false} /> : <motion.span key="waves" className="audio-wave" data-playing={session?.isPlaying ?? false} data-paused={Boolean(session && !session.isPlaying)} aria-hidden="true">{audioLevels.map((level, index) => <i key={index} style={{ "--audio-level": level } as CSSProperties} />)}</motion.span>}
        </AnimatePresence>
      </motion.span>
      <AnimatePresence initial={false} mode="wait">
        {(activityText || showTrack) && <motion.span key={activityText ?? `track-${session?.title}`} className="collapsed-activity-copy" title={activityText ?? session?.title} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>{activityText ?? session?.title}</motion.span>}
      </AnimatePresence>
      <time>{formatTime(now)}</time>
    </motion.button>
  );
}
