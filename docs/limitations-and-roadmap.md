# Known limitations and roadmap

## Current limitations

### Media compatibility

Hamin depends on Windows media sessions. Applications that do not publish a session cannot be controlled. Metadata, artwork, seeking, and transport capabilities vary by player and stream.

### Transparent-window text rendering

Transparent WebView2 windows do not receive the same ClearType path as fully opaque native surfaces. Hamin releases text transforms after animation to minimize softness, but moving text may be temporarily less sharp during transitions.

### Activity inbox

The Companion Hub records Hamin-generated capsules for the current run. It is not yet a Windows notification listener and does not persist the inbox.

### Privacy indicators

Windows privacy settings can be opened, and privacy is represented as a capsule category, but live attribution of microphone/camera use to arbitrary applications is not implemented. Doing this reliably requires deeper, version-sensitive Windows integration.

### Calendar and meetings

Hamin can open the registered system calendar handler. It does not currently retrieve calendar events or control calls. Calendar and meeting data require an authenticated provider with explicit permissions.

### Downloads and transfers

Browser downloads, Explorer copy operations, archive extraction, and cloud synchronization do not share one reliable public Windows API. Provider- or application-specific adapters are required.

### Audio routing

Hamin controls master volume and reports the default output device. It does not directly select a new default device or provide per-application volume controls. The current audio profiles are volume presets.

### Devices and phone integration

Arbitrary Bluetooth battery telemetry and Phone Link status are not currently exposed. Device support varies by driver, Bluetooth profile, and Windows service.

### Active-display following

Static multi-monitor positioning works. Automatically moving Hamin to the monitor containing the foreground window is capability-gated and disabled.

### Automatic updates

The preference model reserves update behavior, but automatic updates are disabled until a signed release endpoint and updater configuration exist.

### File shelf

Dropping files opens Drop & act, with up to eight unique paths, image previews (PNG/JPEG/GIF/WebP up to 5 MB), UTF-8 text previews up to 64 KB, copy text/path actions, and Open/Reveal. Each drop replaces the shelf. It does not yet support OCR, resizing, ZIP creation, dragging files back out, per-item pinning, or expiration.

### Focus sessions

Timers and history work, but automatic Pomodoro cycles, break scheduling, labels, Do Not Disturb integration, and detailed analytics are not implemented.

## Recommended roadmap

### Phase 1: production foundation

- Decide the final product name and migrate identifiers.
- Add frontend unit/component tests and Rust tests for command validation.
- Split the large stylesheet by feature without changing cascade behavior.
- Add a user-visible diagnostic export with privacy redaction.
- Configure crash reporting only if it can remain opt-in and privacy-preserving.
- Sign installers and test upgrades.

### Phase 2: deeper Windows companion behavior

- Active-monitor following based on foreground-window monitor bounds.
- Event-driven foreground context instead of view-scoped polling.
- Direct output-device switching using a supported, maintainable mechanism.
- Per-application audio sessions.
- Improved device-connect and battery capsules where Windows provides stable data.
- More comprehensive focus cycles and Do Not Disturb integration.

### Phase 3: provider integrations

- Calendar provider abstraction with explicit OAuth scopes.
- Meeting-provider adapters with capability negotiation.
- Browser extension or native messaging adapter for downloads.
- Optional cloud/service connectors isolated from the local core.

### Phase 4: shell maturity

- Notification inbox only after selecting a stable and permission-conscious Windows integration.
- Rich file shelf with thumbnails, pinning, individual expiration, and drag-out.
- User-defined context rules and profile automation.
- Carefully evaluated taskbar-replacement expansion without recreating the entire Windows shell.

## Acceptance rule for new features

A proposed feature should answer yes to most of these questions:

- Does it prevent opening a larger window for a common task?
- Is the information timely and transient?
- Can it work without continuous high-cost polling?
- Is its source trustworthy and clearly identified?
- Can it be disabled?
- Does it preserve companion mode as the safe default?
- Does it degrade honestly when unsupported?
