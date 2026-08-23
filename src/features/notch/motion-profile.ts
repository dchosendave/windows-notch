import type { HaminSettings } from "@/features/settings/settings-schema";

export function getMotionProfile(settings: Pick<HaminSettings, "animations" | "motionStyle">) {
  if (!settings.animations || settings.motionStyle === "instant") {
    return { duration: 0, durationMs: 0, ease: (progress: number) => progress, contentDuration: 0 };
  }
  if (settings.motionStyle === "smooth") {
    return { duration: 0.28, durationMs: 280, ease: (progress: number) => 1 - (1 - progress) ** 4, contentDuration: 0.2 };
  }
  return { duration: 0.18, durationMs: 180, ease: (progress: number) => 1 - (1 - progress) ** 3, contentDuration: 0.15 };
}
