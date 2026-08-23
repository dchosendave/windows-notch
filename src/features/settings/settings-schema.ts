import { z } from "zod";

export const settingsSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  operatingMode: z.enum(["companion", "replacement"]).default("companion"),
  density: z.enum(["compact", "comfortable", "large"]).default("comfortable"),
  collapsedLayout: z.enum(["waves", "track", "battery", "minimal"]).default("waves"),
  inactivityMs: z.union([z.literal(0), z.literal(2000), z.literal(3000), z.literal(5000), z.literal(10000)]).default(3000),
  launchAtLogin: z.boolean().default(false),
  alwaysOnTop: z.boolean().default(true),
  expandOnHover: z.boolean().default(true),
  revealOnTrackChange: z.boolean().default(true),
  globalShortcut: z.boolean().default(true),
  shortcut: z.enum(["CommandOrControl+Shift+Space", "Alt+Space", "CommandOrControl+Alt+H"]).default("CommandOrControl+Shift+Space"),
  monitor: z.number().int().min(0).default(0),
  horizontalOffset: z.number().int().min(-1000).max(1000).default(0),
  topOffset: z.number().int().min(0).max(200).default(0),
  accent: z.enum(["blue", "violet", "emerald", "artwork"]).default("blue"),
  surfaceStyle: z.enum(["glass", "solid", "oled"]).default("glass"),
  floatingOffset: z.number().int().min(0).max(30).default(10),
  cornerRadius: z.number().int().min(10).max(28).default(18),
  surfaceOpacity: z.number().min(0.82).max(1).default(0.98),
  animations: z.boolean().default(true),
  motionStyle: z.enum(["instant", "responsive", "smooth"]).default("responsive"),
  audioVisualization: z.enum(["off", "reactive"]).default("reactive"),
  wheelVolume: z.boolean().default(true),
  middleClickPlayPause: z.boolean().default(true),
  quickNote: z.string().max(500).default(""),
  clipboardHistory: z.array(z.string().max(300)).max(8).default([]),
  clipboardHistoryEnabled: z.boolean().default(true),
  capsuleMinimumPriority: z.enum(["low", "normal", "high"]).default("low"),
  capsuleCategories: z.object({
    media: z.boolean().default(true),
    audio: z.boolean().default(true),
    power: z.boolean().default(true),
    network: z.boolean().default(true),
    timer: z.boolean().default(true),
    clipboard: z.boolean().default(true),
    privacy: z.boolean().default(true),
    device: z.boolean().default(true),
  }).default({ media: true, audio: true, power: true, network: true, timer: true, clipboard: true, privacy: true, device: true }),
});

export type HaminSettings = z.infer<typeof settingsSchema>;

export const defaultSettings: HaminSettings = settingsSchema.parse({});

export function repairSettings(input: unknown): { settings: HaminSettings; repaired: boolean } {
  const sourceInput = input && typeof input === "object" ? { ...input as Record<string, unknown> } : {};
  if (sourceInput.schemaVersion === undefined && sourceInput.taskbarReplacement === true) sourceInput.operatingMode = "replacement";
  const direct = settingsSchema.safeParse(sourceInput);
  if (direct.success) return { settings: direct.data, repaired: false };
  const repaired: Record<string, unknown> = {};
  for (const key of Object.keys(defaultSettings) as Array<keyof HaminSettings>) {
    const result = settingsSchema.shape[key].safeParse(sourceInput[key]);
    repaired[key] = result.success ? result.data : defaultSettings[key];
  }
  return { settings: settingsSchema.parse(repaired), repaired: true };
}
