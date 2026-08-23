# Development guide

## Prerequisites

- Windows 11
- Node.js with npm
- Stable Rust
- MSVC C++ build tools and Windows SDK
- Microsoft WebView2 Runtime

## Install and run

```powershell
npm install
npm run tauri dev
```

The frontend development server runs at `http://localhost:1420` and Tauri hosts it inside the transparent native window.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Run Vite without the native host. Useful only for limited UI work. |
| `npm run tauri dev` | Run the full Windows application. |
| `npm run build` | Type-check and build the frontend. |
| `npm run check` | Build the frontend and run `cargo check`. |
| `npm run verify` | Build, format-check, lint Rust with warnings denied, and run Rust tests. |
| `npm run release` | Build the production NSIS package. |

## Recommended workflow

1. Make feature-local changes under `src/features` or `src-tauri/src`.
2. Keep native calls behind `native-client.ts`.
3. Validate external payloads with Zod.
4. Add or update settings through `settings-schema.ts`; never rely on an unvalidated stored field.
5. Add new notch modes to both `NotchMode` and `VIEW_SIZES`.
6. Ensure special views use the shared resolved native/rendered size.
7. Respect reduced motion and avoid persistent transforms on text containers.
8. Run `npm run verify` before handing off changes.
9. Manually exercise the native behavior in `npm run tauri dev`.

## Adding a native command

1. Implement the command in the appropriate Rust module.
2. Validate all user-controlled strings and numeric ranges in Rust.
3. Register it in `tauri::generate_handler!` in `src-tauri/src/lib.rs`.
4. Add a typed wrapper in `src/shared/native/native-client.ts`.
5. Report operational failures through the shared frontend error path.
6. Add required Windows crate features narrowly in `Cargo.toml`.
7. Add tests for pure validation or geometry logic where practical.

## Adding a setting

1. Add the field and default to `settingsSchema`.
2. Confirm `repairSettings` can repair the field independently.
3. Add a typed UI control.
4. Add any native/plugin side effect to the serialized update workflow.
5. Document storage, privacy, and compatibility consequences.

## Adding a view

1. Add its mode to `NotchMode`.
2. Define its size in `VIEW_SIZES`.
3. Add it to the directional mode order.
4. Implement a purpose-specific component rather than extending `App.tsx` with large markup.
5. Wire opening and closing through the notch store.
6. Check overflow at all density settings.
7. Test native resizing, focus loss, Escape, hover leave, and dropdown interaction.

## Release build

```powershell
npm run release
```

The NSIS installer is produced beneath:

```text
src-tauri/target/release/bundle/nsis/
```

Before public distribution:

- Replace the codename/product identity deliberately and migrate persistent identifiers if required.
- Configure Authenticode signing.
- Configure a signed update endpoint before enabling updates.
- Test clean install, upgrade, uninstall, and taskbar recovery.
- Review the Content Security Policy after adding any provider domains.
- Produce release notes and retain rollback installers.

## Code quality expectations

- No arbitrary shell construction from user input.
- No privileged native operation directly from React.
- No fake provider data.
- No uncontrolled polling when an event subscription exists.
- No unbounded activity, clipboard, focus, or file history.
- No whole-view transform that remains after animation.
- No silent settings side-effect failure.

