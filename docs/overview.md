# Product overview

## What Hamin is

Hamin is a lightweight desktop companion for Windows 11. Its primary surface is a small, always-available notch that can show media activity, time, battery state, timers, and temporary notifications called capsules. Expanding the notch provides focused controls without becoming a conventional full-screen dashboard.

The application is implemented with Tauri 2, Rust, React, and TypeScript. Windows integrations live in Rust; presentation and interaction logic live in React.

## Product goals

Hamin is designed to:

- Reduce trips to large system panels for common actions.
- Present information only when it is relevant.
- Complement the Windows taskbar instead of duplicating every taskbar feature.
- Remain useful in a compact form on high-refresh-rate and multi-monitor setups.
- Keep resource usage substantially below a typical Electron desktop application.
- Preserve user control over persistence, notifications, animation, and taskbar behavior.
- Fail safely when an optional Windows API or external provider is unavailable.

## Non-goals

Hamin is not intended to be:

- A complete Windows shell or Explorer replacement.
- A full notification-center replacement.
- A background clipboard recorder.
- A universal controller for applications that expose no supported Windows or provider API.
- A source of fabricated calendar, download, privacy, or device information.

## Recommended operating model

Companion mode is recommended. In this mode, Hamin remains available above the desktop while Windows continues to own the taskbar, Start menu, notification area, window switching, and application lifecycle.

Taskbar replacement mode is experimental. It requests the Windows taskbar auto-hide state and depends on Windows shell behavior. Hamin does not terminate Explorer or permanently remove the taskbar.

## Core concepts

### Collapsed notch

The smallest persistent surface. Depending on configuration, it can show reactive audio waves, the current track, battery information, or a minimal activity dot.

### Expanded views

Purpose-specific panels displayed inside the notch:

- Dashboard and media controls
- Companion Hub
- System controls
- Focus timer
- Command palette
- Settings
- First-run onboarding

### Capsules

Capsules are short-lived status messages that temporarily replace collapsed content. They are categorized, prioritized, queued, rate-limited, and optionally retained in the Companion Hub activity inbox.

### Companion Hub

The hub collects context and recent activity in one place. It shows the application behind Hamin, activity history, process diagnostics, and capability-gated shortcuts.

### Profiles

Profiles apply coordinated behavior and appearance preferences for common situations. Available presets are Work, Gaming, Minimal, and Presentation; Custom preserves individually selected behavior.

## Design principles

1. **Transient by default.** Information should disappear when it is no longer useful.
2. **No fake integrations.** Missing provider data is shown as unavailable rather than simulated.
3. **Local-first behavior.** Media, power, audio, settings, and diagnostics use local Windows APIs.
4. **Safe degradation.** Unsupported media controls, privacy data, or device telemetry should not crash the application.
5. **Accessible motion.** Animation preferences and operating-system reduced-motion settings are respected.
6. **Native boundaries.** Privileged operations are validated and implemented in Rust rather than arbitrary browser code.

## Naming

`Hamin` is currently both the display name and stable internal codename. Persistent identifiers, the settings filename, event prefixes, and installer identifier should be migrated deliberately if the product is renamed.

