# Feature reference

## Window and notch behavior

- Transparent, frameless Windows 11 surface.
- Hidden from the taskbar and Alt+Tab through Windows tool-window styling.
- Always-on-top option.
- Collapsed, hover-preview, attached, temporary, and interaction-locked phases.
- Immediate expansion on hover when enabled.
- Immediate collapse after leaving a hover preview.
- Configurable inactivity collapse for attached dashboard/media views.
- Native window resizing synchronized with rendered view dimensions.
- Floating gap when collapsed or previewed; click attachment can align the notch to the top edge.
- Escape collapses the notch.
- Dropdown interaction locks prevent the notch from closing while a select menu is open.

## Media

Hamin uses Windows Global System Media Transport Controls sessions.

- Detects compatible players such as Spotify, supported browsers, and compatible VLC configurations.
- Shows title, artist, album, artwork, source application, duration, and position when provided.
- Play/pause, previous, and next controls when supported by the selected session.
- Seeking when the media session exposes seek capability.
- Multiple-session selection.
- Live playback-position interpolation between native updates.
- Album-art-derived accent option.
- Track-change reveal sequence: “Now playing,” title, artist, then normal collapsed content.
- Middle-click play/pause from collapsed mode.
- Mouse-wheel master-volume adjustment from collapsed mode.

Media support depends on what each player publishes to Windows. A playing application may expose incomplete metadata or no controllable media session.

## Audio

- Native Windows master-volume reading and adjustment.
- Native mute/unmute.
- Current default output-device name and output-device count.
- Quick access to Windows sound settings.
- Quiet (25%), Balanced (55%), and Loud (80%) volume profiles.
- Reactive system-output visualization with recovery when the default device changes.
- Audio capsules for volume and mute changes.

Hamin does not yet provide per-application mixing or direct default-device switching.

## Power and network

- Battery percentage and charging state.
- Battery-aware collapsed layout.
- Low-battery and charging capsules.
- Network connected/disconnected capsules based on browser connectivity events.

## Focus timer

- Persistent end time and duration across restarts.
- Animated progress ring and rolling countdown digits.
- User-configurable presets from 1 to 180 minutes.
- Stop control and completion capsule.
- High-priority completion behavior.
- Count of completed focus sessions during the last seven days.

## Companion Hub

- Native foreground-context detection.
- Skips Hamin itself and reports the visible application behind it.
- Process name, window title, process identifier, and broad context category.
- Categories include development, browser, meeting, media, files, and general application.
- Recent capsule/activity inbox, limited to 30 entries per run.
- Priority indicators, relative timestamps, individual dismiss, and clear-all.
- Process memory and uptime diagnostics.
- Shortcuts to Windows privacy settings and the system calendar handler.
- Honest notices for provider-dependent functionality.

The activity inbox currently stores Hamin-generated capsules, not the complete Windows notification stream.

## Command palette

- Searchable built-in commands.
- System audio, focus timer, clipboard capture, Explorer, Windows Settings, and diagnostics actions.
- Quick note, limited to 500 characters.
- Explicit clipboard capture and recent snippet reuse.
- File shelf for paths dropped onto the notch.
- User-created commands.
- Configurable global shortcut.

Custom commands accept only:

- `https://` URLs
- `http://` URLs
- `ms-settings:` URIs
- Existing absolute filesystem paths

## File shelf

- Accepts native file drops.
- Holds up to eight paths from the latest drop.
- Optional persistence across restarts.
- Copy path.
- Reveal selected file in Explorer.
- Clear all held paths.
- Drag-over visual feedback.

The shelf stores paths, not copies of file contents. Moving or deleting the original file invalidates the entry.

## Clipboard

- Explicit capture only.
- Up to eight unique snippets.
- Maximum 300 characters per item.
- Copy a captured item back to the clipboard.
- Expiration options: never, 15 minutes, one hour, or one day.
- Clear private data from Settings.

Hamin does not continuously monitor the clipboard.

## Capsules

Categories:

- General
- Media
- Audio
- Power
- Network
- Timer
- Clipboard
- Privacy
- Device

Priorities:

- Low
- Normal
- High

Higher-priority capsules can interrupt lower-priority messages. Related messages can be grouped or replaced, and rapid events such as volume changes are rate-limited. Category and minimum-priority filters are configurable.

## Appearance and motion

- Compact, Comfortable, and Large density.
- Waves and clock, Track title, Battery, and Minimal collapsed layouts.
- Blue, Violet, Emerald, and album-art accent modes.
- Glass, Solid, and OLED surfaces.
- Surface opacity and corner radius.
- Floating gap and positional offsets.
- Instant, Responsive, and Smooth motion profiles.
- Direction-aware navigation transitions.
- Artwork and media-state transitions.
- Reduced-motion support.
- Text-bearing layers release transforms after animation to preserve WebView2 text sharpness.

## Profiles

- **Work:** comfortable density, track-focused content, normal-priority capsules, context awareness, and work-oriented behavior.
- **Gaming:** compact, minimal, important-only capsules, no hover expansion.
- **Minimal:** compact minimal layout with reduced contextual behavior.
- **Presentation:** unobtrusive collapsed display, important-only updates, privacy emphasis, and no track reveal.
- **Custom:** individually configured preferences.

## Windows integration and reliability

- Launch at login.
- Global shortcut registration and replacement.
- Multi-monitor selection and DPI-aware positioning.
- Quick access to Explorer, Search, Settings, Task Manager, Calculator, Wi-Fi, Bluetooth, Display, Sound, and privacy pages.
- Single-instance enforcement.
- Structured application logging.
- Taskbar auto-hide recovery during normal exit, panic, and stale-state startup.
- Settings validation, field-level repair, and a recovery backup.
- Strict content security policy.

