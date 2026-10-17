# Architecture

## Technology stack

- **Tauri 2:** native window, command transport, packaging, and plugins
- **Rust:** Windows APIs, validation, reliability, and privileged operations
- **React 19 + TypeScript:** view composition and interaction
- **Vite:** frontend development and production bundling
- **Zustand:** small shared state stores
- **Zod:** runtime validation at persistence and native-data boundaries
- **Motion:** coordinated transitions and reduced-motion behavior
- **Tailwind/shadcn foundations:** styling utilities and selected primitives
- **Lucide:** interface icons

## Process boundary

The WebView must not directly perform privileged Windows actions. Frontend code calls the typed native client in `src/shared/native/native-client.ts`, which invokes allowlisted Tauri commands. Rust validates inputs and calls Windows APIs.

```text
React feature/view
      ↓
typed native client
      ↓ Tauri invoke/event
Rust command/service
      ↓
Windows API
```

## Frontend structure

```text
src/
├── features/
│   ├── command/       command palette, clipboard and file shelf
│   ├── companion/     Companion Hub and foreground context
│   ├── media/         media schema, sessions, artwork, live position
│   ├── notch/         phase/mode state, geometry, dashboard, window sync
│   ├── onboarding/    first-run education
│   ├── power/         battery state and iconography
│   ├── productivity/  focus timer
│   ├── settings/      schema, persistence, controls
│   ├── system/        volume, devices, visualization
│   └── tasks/         safe Windows quick actions
├── shared/
│   ├── components/    reusable application components
│   ├── config/        stable product identifiers
│   ├── hooks/         clocks and transient capsule activity
│   ├── lib/           formatting and operational error reporting
│   ├── motion/        motion tokens and reusable primitives
│   └── native/        typed invoke boundary
├── styles/            feature stylesheets, imported in cascade order by App.css
├── App.tsx            composes feature hooks and renders the notch surface
└── App.css            Tailwind/font imports plus ordered feature stylesheet imports
```

## Native structure

```text
src-tauri/src/
├── audio.rs             master volume and output device
├── audio_visualizer.rs  system-output level sampling
├── com.rs               COM apartment lifecycle helpers
├── context.rs           foreground application context
├── diagnostics.rs       process memory and uptime
├── error.rs             native error types
├── media.rs             Windows media sessions and controls
├── notch_window.rs      sizing, placement, DPI, tool-window styles
├── power.rs             Windows power state and events
├── reliability.rs       single-instance behavior
├── taskbar.rs           replacement state and recovery watchdog
├── tasks.rs             validated Windows launch actions
└── lib.rs               application setup and command registration
```

## Notch state model

`NotchPhase` describes interaction behavior:

- `collapsed`
- `hover-preview`
- `attached`
- `temporary`
- `interaction-locked`

`NotchMode` describes displayed content:

- `idle`
- `media`
- `companion`
- `system`
- `productivity`
- `command`
- `settings`

Phase and mode are independent. This prevents content selection from becoming entangled with window attachment and collapse behavior.

## App composition

`App.tsx` only wires feature hooks together. Behavior lives in the features:

- `use-notch-controller.ts`: expand/collapse, inactivity, select locks, focus loss, Escape, and pointer handlers (`useNotchController`), plus native sizing and onboarding (`useNotchLayout`).
- `notch-logic.ts`: pure phase, auto-collapse, and view-direction rules.
- `NotchViews.tsx`: routes the expanded notch to the view for the current mode and loads per-view data when a view opens.
- `hamin-commands.ts` and `use-clipboard-history.ts`: command palette entries and explicit clipboard capture.
- `use-notch-theme.ts`: accent and surface CSS variables, including root-level tokens for portaled select menus.
- `capsule-queue.ts`: capsule priority, grouping, filtering, and rate limiting, independent of React.

Stylesheets keep the original cascade order; when adding rules, put them in the feature's file and check that no earlier file styles the same element with equal specificity.

## Sizing

View geometry is centralized in `notch-geometry.ts`. The rendered Motion surface and native Tauri WebView use the same resolved target size. Special surfaces such as onboarding must participate in this resolution; otherwise the native WebView can clip taller React content.

Native resize operations are synchronized through `use-native-notch-window.ts`. Resize state disables pointer interaction while physical window dimensions are changing.

## Media service

The Rust media service owns Windows media-session discovery, selected session state, and event subscriptions. Frontend hooks validate returned payloads before using them. Position is interpolated locally between updates to avoid excessive native polling.

## Audio state

A native watcher thread (`audio::start_watcher`) reads volume, mute, and the default output device every 500 ms and emits `audio-state` only when something changes. Every window listens to that event instead of polling over IPC, so volume changes from the Windows flyout or media keys appear immediately.

## Capsule system

`capsule-queue.ts` implements, and `use-transient-activity.ts` exposes to React:

- Current capsule
- Priority-sorted queue
- Category filtering
- Minimum-priority filtering
- Rate limiting
- Group replacement
- Duration timers
- Bounded in-memory history

Companion events translate media, power, device, and network changes into capsules. General operational errors enter the same presentation path.

## Settings consistency

Settings update through a serialized promise queue. UI state is patched optimistically, side effects are applied, and persistence follows. On failure, the previous complete settings object is restored. This prevents concurrent settings changes from overwriting each other.

## Motion and text rendering

The window is transparent, so WebView2 uses composited rendering. Persistent transforms on text-bearing layers can make text look soft. Hamin therefore:

- Avoids whole-view scale animation.
- Removes permanent `will-change` from text containers.
- Resolves completed view transforms to `none`.
- Keeps richer transforms on icons, artwork, and small visual elements.
- Supports instant and reduced-motion paths.

## Reliability

- Only one Hamin process may own integration state.
- COM initialization and service ownership are explicit.
- The audio visualizer has a controlled worker lifecycle.
- Taskbar state is restored on exit and panic.
- A watchdog repairs taskbar state after Explorer changes.
- Stale replacement state is repaired at startup only by the primary process.

