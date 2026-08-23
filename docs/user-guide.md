# User guide

## First launch

Hamin initially opens a three-step onboarding view explaining its purpose, capsule behavior, and privacy defaults. Select **Continue** through the pages and **Get started** to save completion.

Onboarding can be replayed from Settings → Backup → Replay onboarding.

## Everyday interaction

### Expanding and collapsing

- Hover over the collapsed notch to open a preview when Expand on hover is enabled.
- Click the collapsed notch to open an attached view.
- Move away from a hover preview to collapse immediately.
- Select the chevron-up control or press Escape to collapse an attached view.
- Dashboard and media views may collapse automatically after the configured inactivity duration.
- Utility views remain open while intentionally being used and close through Back, Escape, collapse, or focus loss.

### Opening views

The dashboard header contains shortcuts for:

- Companion Hub
- Command palette
- Focus timer
- System controls
- Settings
- Collapse

The global shortcut opens the command palette directly. The default is `Ctrl+Shift+Space`.

## Recommended setup

For most users:

1. Keep Operating mode set to Companion.
2. Enable Always on top.
3. Choose the correct display and adjust the horizontal and top offsets.
4. Use a floating gap between 8 and 12 pixels.
5. Keep minimum capsule priority at All updates initially.
6. Disable capsule categories that become distracting after several days of use.
7. Keep clipboard expiry at one hour unless snippets must survive longer.
8. Leave Persistent file shelf disabled for temporary transfers; enable it only if path restoration is useful.

## Media workflow

1. Start playback in a Windows media-session-compatible player.
2. Expand Hamin to view artwork and controls.
3. Use the source label to cycle through players when more than one session exists.
4. Drag the timeline to seek if the player reports seek support.
5. Collapse Hamin; audio waves or track information continue in the chosen collapsed layout.

If media is not detected, confirm the player exposes Windows media controls. Some VLC installations require its system-media integration to be enabled, and some streams provide no metadata.

## Focus workflow

1. Open Focus timer.
2. Select a preset.
3. Collapse Hamin and continue working.
4. The collapsed notch displays the remaining timer when appropriate.
5. Completion produces a high-priority capsule and opens the notch.

Manage timer durations in Settings → Focus presets.

## Companion Hub workflow

Use the Companion Hub when you need context without opening multiple utilities:

- Check the application behind Hamin.
- Review recent capsules.
- Dismiss noisy or obsolete activity.
- Inspect Hamin memory use and uptime.
- Open Windows privacy controls.
- Open the configured system calendar handler.

The hub’s inbox contains Hamin activity. It does not intercept all Windows notifications.

## File shelf workflow

1. Drag files from Explorer over Hamin.
2. Wait for the “Drop to hold” affordance.
3. Drop the files.
4. Open the command palette to see held paths.
5. Copy a path or reveal the file in Explorer.

Enable Persistent file shelf if paths should be restored after restarting Hamin. The original files are never copied into Hamin.

## Clipboard workflow

1. Copy text normally in another application.
2. Open the command palette.
3. Select Capture in the Clipboard panel or run Capture clipboard.
4. Select a stored snippet to copy it again.

Clipboard reads require an explicit user action. Disable Clipboard history to clear stored entries and prevent capture.

## Custom commands

Open Settings → Custom commands → Add command. Provide a short label and one of the following targets:

- A web URL such as `https://example.com`
- A Windows Settings URI such as `ms-settings:display`
- An absolute path such as `C:\Tools\Example.exe`

The command appears in the searchable command palette. Removing it from Settings deletes only the command definition, not the target.

## Choosing a profile

- Use Work for media, focus, and context during normal desktop work.
- Use Gaming for a smaller notch and important-only interruptions.
- Use Minimal when screen space matters most.
- Use Presentation to suppress nonessential visual changes.
- Use Custom when manually tuning individual preferences.

Changing a preset applies a group of settings. Later individual changes remain saved even if the profile name is unchanged.

## Taskbar replacement

Taskbar replacement is experimental. Before enabling it:

1. Confirm Hamin launches and exits normally.
2. Keep the Windows taskbar’s screen edge accessible as an emergency fallback.
3. Avoid force-killing Hamin during initial testing.
4. Verify that exiting Hamin restores the prior taskbar state.

Hamin requests Windows auto-hide; it does not terminate Explorer.

