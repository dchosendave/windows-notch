# Hamin documentation

Hamin is a compact Windows 11 companion surface built around the idea that useful controls and temporary information should be available without permanently occupying desktop space. It appears as a floating notch near the top of a display, expands when needed, and returns to a small collapsed state afterward.

Hamin can complement the Windows taskbar or, in an experimental mode, request taskbar auto-hide. Companion mode is the recommended default.

## Documentation map

- [Product overview](overview.md) — purpose, principles, terminology, and intended audience
- [Feature reference](features.md) — current capabilities and behavior
- [User guide](user-guide.md) — setup, everyday workflows, and recommended usage
- [Configuration reference](configuration.md) — every major preference and profile
- [Architecture](architecture.md) — frontend/native boundaries, state, data flow, and design decisions
- [Development guide](development.md) — prerequisites, commands, project structure, and contribution workflow
- [Privacy and security](privacy-and-security.md) — stored data, native permissions, custom-action safeguards, and taskbar safety
- [Testing guide](testing.md) — automated validation and manual test scenarios
- [Known limitations and roadmap](limitations-and-roadmap.md) — capability boundaries and future integration work

## Project status

The current package version is `0.1.0`. The application is suitable for development and hands-on testing, but taskbar replacement and provider-dependent integrations should still be treated as experimental. Production distribution should use signed installers and a configured update service.

## Quick start

Requirements:

- Windows 11
- Node.js and npm
- Stable Rust with the MSVC toolchain
- Microsoft WebView2 Runtime

```powershell
npm install
npm run tauri dev
```

Run the complete validation suite with:

```powershell
npm run verify
```

