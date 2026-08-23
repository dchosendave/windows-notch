# Testing guide

## Automated verification

Run:

```powershell
npm run verify
```

This performs:

1. TypeScript compilation
2. Vite production build
3. Rust format check
4. Clippy for all targets with warnings treated as errors
5. Rust library tests

Also run `git diff --check` before committing to catch whitespace errors.

## Manual smoke test

### Startup and window

- Start with `npm run tauri dev`.
- Confirm only one instance remains active.
- Confirm Hamin does not appear in Alt+Tab or the taskbar.
- Confirm onboarding is fully visible and not clipped.
- Complete onboarding and restart; it should not replay.
- Replay onboarding from Settings and confirm native/resolved sizing remains synchronized.

### Collapse behavior

- Hover collapsed Hamin and verify immediate expansion.
- Leave without interacting and verify immediate collapse.
- Click collapsed Hamin and verify attachment.
- Verify configured inactivity collapse on dashboard/media views.
- Confirm Settings, Command, System, Companion, and Focus views remain open while being inspected.
- Open a dropdown, move the pointer away, and verify the interaction lock prevents collapse.

### Media

- Test Spotify or another compatible player.
- Verify metadata, artwork, play/pause, previous, next, and seek capability states.
- Test multiple active sessions.
- Pause and resume playback.
- Change tracks and confirm the reveal sequence.
- Confirm unsupported controls are disabled.
- Confirm VLC behavior matches what VLC publishes to Windows.

### Audio

- Change the volume slider.
- Toggle mute.
- Select Quiet, Balanced, and Loud profiles.
- Scroll over collapsed Hamin when Volume wheel is enabled.
- Switch the Windows output device and refresh System controls.
- Verify audio visualization resumes after device changes.

### Capsules

- Start and stop a focus timer.
- Change volume repeatedly and confirm rate-limited replacement.
- Disconnect and reconnect networking.
- Connect/disconnect laptop power where applicable.
- Capture clipboard text.
- Drop files onto Hamin.
- Review events in the Companion Hub.
- Test category filters and all three minimum-priority settings.

### Companion Hub

- Open Hamin over several applications.
- Confirm it reports the application behind Hamin, not Hamin itself.
- Test development, browser, media, Explorer, and general categories.
- Refresh diagnostics and verify plausible memory and uptime.
- Dismiss individual activity and clear all activity.

### File shelf

- Drag one and several files over Hamin.
- Confirm drag-over feedback.
- Copy a path and compare it to the source.
- Reveal a file in Explorer.
- Enable persistence, restart, and verify restoration.
- Disable persistence and restart; entries should not return.

### Clipboard

- Capture text explicitly.
- Capture duplicate text and confirm de-duplication.
- Copy a stored snippet.
- Test expiration with the 15-minute setting where practical.
- Disable history and confirm entries clear.
- Clear private data.

### Settings and profiles

- Apply every profile and inspect the resulting controls.
- Change display and positional offsets.
- Test all densities, surfaces, accents, and collapsed layouts.
- Disable animations and confirm sharp, immediate text.
- Enable animations and confirm text becomes sharp when transitions finish.
- Export settings, modify a valid field, and import.
- Import invalid values and verify repair/error behavior.

### Custom commands

- Add and launch an HTTPS URL.
- Add and launch `ms-settings:display`.
- Add and launch an existing absolute path.
- Attempt a relative path or shell expression and verify native rejection.
- Remove a command.

### Taskbar replacement

Use a noncritical test environment first.

- Record the original Windows auto-hide state.
- Enable replacement mode after acknowledging the warning.
- Exit normally and confirm restoration.
- Restart Explorer and confirm watchdog behavior.
- Relaunch Hamin after an interrupted run and confirm stale-state recovery.

## Performance observations

Use Companion Hub diagnostics and Task Manager to watch:

- Working-set memory at idle and during audio visualization
- CPU use while collapsed
- CPU use during animation
- Stability after repeated media-session and output-device changes
- Resource recovery after closing expanded views

High-refresh-rate testing should include 60Hz, 120Hz, 144Hz, and 180Hz where available.

