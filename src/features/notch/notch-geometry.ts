import type { HaminSettings } from "@/features/settings/settings-schema";
import type { NotchMode } from "./notch-store";

export type NotchSize = { width: number; height: number };

export const COLLAPSED_SIZES: Record<HaminSettings["density"], { minimal: NotchSize; activity: NotchSize }> = {
  compact: { minimal: { width: 138, height: 32 }, activity: { width: 260, height: 36 } },
  comfortable: { minimal: { width: 164, height: 36 }, activity: { width: 300, height: 40 } },
  large: { minimal: { width: 190, height: 40 }, activity: { width: 330, height: 44 } },
};

export const VIEW_SIZES: Record<NotchMode, NotchSize> = {
  files: { width: 500, height: 340 },
  idle: { width: 460, height: 196 },
  media: { width: 460, height: 196 },
  companion: { width: 500, height: 340 },
  system: { width: 460, height: 300 },
  productivity: { width: 460, height: 220 },
  command: { width: 500, height: 320 },
  settings: { width: 520, height: 360 },
};
