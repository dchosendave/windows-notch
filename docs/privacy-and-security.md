# Privacy and security

## Privacy model

Hamin is local-first. Current media, power, audio, foreground context, and process diagnostics are obtained from local Windows APIs. The application has no configured analytics or cloud synchronization service.

## Data stored by Hamin

### Tauri settings store

The preferences store can contain:

- Appearance and behavior settings
- Selected monitor and offsets
- Quick note
- Explicitly captured clipboard snippets
- Clipboard capture timestamp
- Custom command labels and targets
- Focus presets
- Integration preferences

### Browser local storage inside WebView2

Local storage can contain:

- Active focus timer end time and duration
- Recent focus completion timestamps
- File shelf paths when persistence is enabled

### Memory only

- Current capsule queue
- Recent capsule inbox for the current run
- Current media and audio state
- Foreground context
- Process diagnostics

## Clipboard behavior

Hamin reads clipboard text only after an explicit Capture action. It does not continuously monitor clipboard changes. Captured text is limited in length and count. Expiration can automatically clear stored history.

Clipboard content may still be sensitive. Use Clear private data before sharing a settings store or device profile.

## File shelf behavior

The file shelf stores filesystem paths only. It does not upload, copy, or modify file contents. Reveal in Explorer passes a validated absolute path to Explorer. A persisted path can reveal filenames or folder structure to anyone with access to the local profile.

## Foreground context

The Companion Hub can read the visible window title, executable name, and process identifier of the application behind Hamin. This data is polled only while the Companion Hub is open and context awareness is enabled. It is not persisted.

Window titles can contain document names or private information. Disable App context if this is undesirable.

## Custom commands

Custom targets are validated in Rust. Allowed targets are:

- HTTP or HTTPS URLs
- Windows Settings URIs
- Existing absolute filesystem paths

Arbitrary command-line arguments and shell expressions are not accepted. Hamin delegates opening to Windows `ShellExecuteW` after validation.

## Native permissions and CSP

Tauri capabilities are restricted to the main window and explicitly enabled plugins. The Content Security Policy blocks arbitrary remote scripts, objects, frames, and form submission. Images support local, data, and blob sources for media artwork.

Adding an external provider requires reviewing both Tauri permissions and the CSP. Do not broadly allow remote script execution.

## Taskbar safety

Replacement mode uses Windows auto-hide rather than killing Explorer. Hamin attempts restoration:

- During normal exit
- During Rust panic handling
- Through the replacement watchdog
- After detecting stale state at the next primary startup

The screen edge remains the emergency Windows fallback. Replacement mode should remain opt-in and clearly marked experimental.

## Logging and diagnostics

Structured logging is enabled through the Tauri log plugin. Avoid logging clipboard snippets, quick notes, full window titles, or custom targets. Process diagnostics expose Hamin memory and uptime only.

## Distribution security

Production installers should be signed. Unsigned Windows applications can trigger SmartScreen warnings and are harder for users to verify. Automatic updates must remain disabled until packages and manifests are cryptographically signed and served from a controlled endpoint.

