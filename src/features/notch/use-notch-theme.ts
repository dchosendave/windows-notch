import { useEffect, type CSSProperties } from "react";
import type { HaminSettings } from "@/features/settings/settings-schema";

const ACCENT_RGB = { blue: "106, 156, 255", violet: "173, 130, 255", emerald: "76, 201, 154" } as const;

/** Resolves accent, opacity, and radius into CSS variables for the notch and root-level popups. */
export function useNotchTheme(settings: HaminSettings, artworkAccent: string) {
  const accent = settings.accent === "artwork" ? artworkAccent : ACCENT_RGB[settings.accent];

  // Select popups render in a portal outside the notch, so the root needs the tokens too.
  useEffect(() => {
    document.documentElement.style.setProperty("--accent-rgb", accent);
    document.documentElement.dataset.density = settings.density;
  }, [accent, settings.density]);

  return {
    "--accent-rgb": accent,
    "--surface-opacity": settings.surfaceOpacity,
    "--notch-radius": `${settings.cornerRadius}px`,
  } as CSSProperties;
}
