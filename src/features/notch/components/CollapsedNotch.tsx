import { type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Clipboard, Headphones, Music2, ShieldAlert, Timer, Volume2, WifiOff } from "lucide-react";
import type { MediaSession } from "@/features/media/media-schema";
import type { PowerState } from "@/features/power/power-schema";
import { BatteryIcon } from "@/features/power/BatteryIcon";
import { formatCountdown, formatTime } from "@/shared/lib/formatters";
import type { CapsuleCategory } from "@/shared/hooks/use-transient-activity";

const capsuleIcons = { general: Bell, media: Music2, audio: Volume2, power: Bell, network: WifiOff, timer: Timer, clipboard: Clipboard, privacy: ShieldAlert, device: Headphones };

export function CollapsedNotch({ session, loading, power, now, activity, capsuleCategory, timerEndsAt, timerRemaining, audioLevels, layout, onExpand }: {
  session: MediaSession | null;
  loading: boolean;
  power: PowerState;
  now: Date;
  activity: string | null;
  capsuleCategory?: CapsuleCategory;
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
    <motion.button key="collapsed" className="collapsed-content" data-activity={Boolean(activityText)} type="button" aria-label={`${ariaStatus}. Expand Hamin`} onClick={onExpand} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
      <span className="collapsed-signal">
        {activity && CapsuleIcon ? <span className="capsule-signal" data-category={capsuleCategory}><CapsuleIcon size={13} /></span> : showBattery ? <span className="battery-signal" data-low={power.low}><BatteryIcon percent={power.percent} charging={power.charging} /><small>{power.percent}</small></span> : layout === "minimal" ? <span className="minimal-signal" data-active={session?.isPlaying ?? false} /> : <span className="audio-wave" data-playing={session?.isPlaying ?? false} data-paused={Boolean(session && !session.isPlaying)} aria-hidden="true">{audioLevels.map((level, index) => <i key={index} style={{ "--audio-level": level } as CSSProperties} />)}</span>}
      </span>
      <AnimatePresence initial={false} mode="wait">
        {(activityText || showTrack) && <motion.span key={activityText ?? `track-${session?.title}`} className="collapsed-activity-copy" title={activityText ?? session?.title} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16 }}>{activityText ?? session?.title}</motion.span>}
      </AnimatePresence>
      <time>{formatTime(now)}</time>
    </motion.button>
  );
}
