# Release checklist

> Production policy: ship Companion mode by default. Taskbar replacement remains experimental until every recovery scenario below passes. Release artifacts must be Authenticode-signed outside the build process when signing credentials are available.

- [ ] Update versions in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.
- [ ] Run `npm ci` and `npm run check` on a clean Windows machine.
- [ ] Run `cargo test --manifest-path src-tauri/Cargo.toml --lib`.
- [ ] Verify media, audio, autostart, shortcut, multi-monitor placement, and taskbar restoration.
- [ ] Review production icons and application metadata.
- [ ] Configure an Authenticode certificate and sign installers.
- [ ] Run `npm run release` and test installation, upgrade, and uninstall.
- [ ] Confirm the taskbar state is restored after disabling replacement mode and exiting.
- [ ] Force-terminate Hamin in experimental replacement mode, relaunch, and confirm stale taskbar state recovery.
- [ ] Verify the restrictive CSP in the packaged build, including album artwork and IPC commands.
- [ ] Test 100%, 125%, 150%, and 200% scaling; multiple monitors; high contrast; keyboard-only use; and reduced motion.
- [ ] Verify Companion mode at idle and while playing media stays within the agreed CPU, GPU, memory, and wake-up budgets.
- [ ] Confirm a second launch activates the existing instance.
- [ ] Confirm corrupted settings are repaired and backed up without preventing startup.
- [ ] Treat taskbar replacement as experimental until forced-exit, Explorer-restart, update, and uninstall recovery all pass.
- [ ] Publish installer checksums and release notes.
