# Configuration reference

Settings are validated with Zod, stored through the Tauri store plugin, and saved automatically. Invalid fields are repaired independently so one corrupt preference does not discard the entire configuration. A recovery backup is retained when repair is necessary.

## Behavior

| Setting | Options/default | Effect |
|---|---|---|
| Operating mode | Companion (default), Replacement | Keeps the taskbar normally or requests experimental auto-hide. |
| Profile | Custom (default), Work, Gaming, Minimal, Presentation | Applies coordinated preferences. |
| Auto-collapse | Off, 2s, 3s (default), 5s, 10s | Inactivity delay for attached dashboard/media views. |
| Launch at login | Off by default | Registers Hamin through the autostart plugin. |
| Always on top | On by default | Keeps the notch above normal windows. |
| Expand on hover | On by default | Opens a hover preview immediately. |
| Media reveal | On by default | Shows the title sequence when playback begins or changes. |
| Global shortcut | On by default | Enables the configured command-palette shortcut. |
| Shortcut keys | Ctrl+Shift+Space by default | Selects one of three supported shortcuts. |
| Volume wheel | On by default | Changes master volume while scrolling over collapsed Hamin. |
| Middle-click media | On by default | Toggles play/pause from collapsed mode. |
| Clipboard history | On by default | Allows explicit snippet capture. |
| App context | On by default | Enables foreground-context reporting in the hub. |
| Activity inbox | On by default | Displays recent Hamin capsule history. |
| Persistent file shelf | Off by default | Persists held paths in local storage. |

## Position

| Setting | Range/default | Effect |
|---|---|---|
| Display | Primary by default | Selects the monitor used for placement. |
| Horizontal offset | -300 to 300 in UI | Moves Hamin relative to centered placement. |
| Top offset | 0 to 100 in UI | Adds distance from the monitor’s top edge. |
| Floating gap | 0 to 30, default 10 | Separates collapsed/preview Hamin from the top. |
| Follow active display | Off by default | Moves Hamin to the monitor containing the foreground window. |

## Appearance

| Setting | Options/default |
|---|---|
| Accent | Blue (default), Violet, Emerald, Album artwork |
| Density | Compact, Comfortable (default), Large |
| Collapsed content | Waves and clock (default), Track title, Battery, Minimal dot |
| Surface | Glass (default), Solid, OLED black |
| Audio waves | Reactive (default), Off |
| Opacity | 82–100%, default 98% |
| Corners | 10–28px, default 18px |
| Motion | Instant, Responsive (default), Smooth |
| Animations | On by default |

Disabling animations also activates the strongest reduced-motion path. Windows reduced-motion preferences are respected by Motion.

## Clipboard

| Setting | Behavior |
|---|---|
| Clipboard expiry | Never, 15 minutes, one hour (default), one day. |

Calendar, meeting, privacy-indicator, and automatic-update settings were removed until real integrations exist. Older settings files that still contain them load normally; the unknown fields are ignored.

## Focus presets

Between one and five unique durations may be stored. Each duration must be from 1 to 180 minutes. Defaults are 5, 15, and 25 minutes.

## Custom commands

Up to twelve definitions are stored. Labels are limited to 40 characters and targets to 500 characters. Rust validates targets again before Windows opens them.

## Capsules

Minimum priority controls whether all, normal-and-important, or important-only messages appear. Categories can be independently disabled. General operational errors intentionally bypass category filtering so failures are not silently hidden.

## Backup and recovery

- Copy settings writes formatted JSON to the clipboard.
- Import settings validates and repairs imported JSON.
- Replay onboarding resets onboarding completion.
- Clear private data removes the quick note and clipboard history.

Settings currently use schema version `1`. Future schema changes should include explicit migration logic before incrementing the version.

