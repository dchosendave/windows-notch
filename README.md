# Hamin

Hamin is a lightweight, customizable notch and taskbar companion for Windows 11. It is built with Tauri, Rust, React, and TypeScript.

Complete product, usage, architecture, privacy, testing, and development documentation is available in [docs/](docs/README.md).

## Features

- Native Windows media sessions with player selection, artwork, playback controls, seeking, wheel volume, and middle-click play/pause
- Reactive system-output meter with default-device recovery
- Battery, clock, calendar summary, focus timers, network/power capsules, and temporary activity feedback
- Native master-volume and mute controls
- Quick launch for Explorer, Search, Settings, Task Manager, and Calculator
- Multi-monitor positioning and DPI-aware offsets
- Command palette with application actions, clipboard snippets, quick notes, and process diagnostics
- Drop & act: local image/text previews, copy text or paths, and Open/Reveal for up to eight dropped items
- App-aware command ordering for editors, browsers, Explorer, media, and communication apps
- Adaptive dashboard actions with persistent layout pinning; disable App context to restore the compact dashboard
- Modular collapsed layouts, album-art accents, density, glass/solid/OLED surfaces, opacity, corners, and floating offset
- Settings import/export and configurable global shortcuts
- Launch at login and a global command shortcut
- Opt-in taskbar replacement using Windows auto-hide with exit, panic, and Explorer-restart recovery
- Single-instance enforcement and structured Rust logging

## Development

Requirements: Windows 11, Node.js and npm, stable Rust with the MSVC toolchain, and Microsoft WebView2 Runtime.

```powershell
npm install
npm run tauri dev
```

Validate the project:

```powershell
npm run check
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

## Production build

```powershell
npm run release
```

The NSIS installer is written beneath `src-tauri/target/release/bundle/nsis/`. Production distribution should use code signing to reduce Windows SmartScreen warnings.

## Taskbar replacement safety

Taskbar replacement is disabled by default. Hamin requests Windows taskbar auto-hide instead of permanently hiding or terminating Explorer. The previous state is restored during normal exit and Rust panic handling, while the screen edge remains an emergency fallback.
