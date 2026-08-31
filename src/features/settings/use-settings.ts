import { useCallback, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { load, type Store } from "@tauri-apps/plugin-store";

import {
  defaultSettings,
  repairSettings,
  type HaminSettings,
} from "@/features/settings/settings-schema";
import { useSettingsStore } from "@/features/settings/settings-store";
import { nativeClient } from "@/shared/native/native-client";
import { PRODUCT } from "@/shared/config/product";

const SETTINGS_KEY = "preferences";
const SETTINGS_FILE = PRODUCT.settingsFile;

function messageFrom(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function useSettings(onShortcut: () => void) {
  const settings = useSettingsStore((state) => state.settings);
  const ready = useSettingsStore((state) => state.ready);
  const error = useSettingsStore((state) => state.error);
  const setSettings = useSettingsStore((state) => state.setSettings);
  const patchSettings = useSettingsStore((state) => state.patchSettings);
  const setReady = useSettingsStore((state) => state.setReady);
  const setError = useSettingsStore((state) => state.setError);
  const store = useRef<Store | null>(null);
  const updateQueue = useRef<Promise<void>>(Promise.resolve());
  const shortcutCallback = useRef(onShortcut);

  useEffect(() => {
    shortcutCallback.current = onShortcut;
  }, [onShortcut]);

  useEffect(() => {
    let disposed = false;

    async function initialize() {
      try {
        const preferencesStore = await load(SETTINGS_FILE, {
          defaults: { [SETTINGS_KEY]: defaultSettings },
        });
        const saved = await preferencesStore.get(SETTINGS_KEY);
        const { settings: parsed, repaired } = repairSettings(saved ?? defaultSettings);
        const launchAtLogin = await isEnabled();
        const hydrated = {
          ...parsed,
          launchAtLogin,
        };

        if (disposed) return;
        store.current = preferencesStore;
        setSettings(hydrated);
        if (repaired) {
          await preferencesStore.set("preferences-recovery-backup", saved);
          await preferencesStore.set(SETTINGS_KEY, hydrated);
          await preferencesStore.save();
          setError("Some invalid settings were repaired; a recovery backup was saved.");
        }
        await getCurrentWindow().setAlwaysOnTop(hydrated.alwaysOnTop);
        await nativeClient.setPlacement({
          monitor: hydrated.monitor,
          horizontalOffset: hydrated.horizontalOffset,
          topOffset: hydrated.topOffset,
        });
        await nativeClient.setTaskbarReplacement(hydrated.operatingMode === "replacement");

        if (hydrated.globalShortcut) {
          await register(hydrated.shortcut, ({ state }) => {
            if (state === "Pressed") shortcutCallback.current();
          });
        }
      } catch (initializationError) {
        if (!disposed) setError(`Settings unavailable: ${messageFrom(initializationError)}`);
      } finally {
        if (!disposed) setReady(true);
      }
    }

    void initialize();
    return () => {
      disposed = true;
      void unregister(useSettingsStore.getState().settings.shortcut).catch(() => undefined);
    };
  }, [setError, setReady, setSettings]);

  const updateSetting = useCallback(
    <Key extends keyof HaminSettings>(key: Key, value: HaminSettings[Key]) => {
      const operation = updateQueue.current.then(async () => {
      const previousSettings = useSettingsStore.getState().settings;
      const previous = previousSettings[key];
      patchSettings({ [key]: value });
      setError(null);

      try {
        if (key === "launchAtLogin") {
          if (value) await enable();
          else await disable();
        } else if (key === "alwaysOnTop") {
          await getCurrentWindow().setAlwaysOnTop(value as boolean);
        } else if (key === "globalShortcut") {
          if (value) {
            await register(useSettingsStore.getState().settings.shortcut, ({ state }) => {
              if (state === "Pressed") shortcutCallback.current();
            });
          } else {
            await unregister(useSettingsStore.getState().settings.shortcut);
          }
        } else if (key === "shortcut") {
          if (useSettingsStore.getState().settings.globalShortcut) {
            await register(value as HaminSettings["shortcut"], ({ state }) => {
              if (state === "Pressed") shortcutCallback.current();
            });
            await unregister(previous as HaminSettings["shortcut"]).catch(() => undefined);
          }
        } else if (key === "monitor" || key === "horizontalOffset" || key === "topOffset") {
          const next = useSettingsStore.getState().settings;
          await nativeClient.setPlacement({
            monitor: next.monitor,
            horizontalOffset: next.horizontalOffset,
            topOffset: next.topOffset,
          });
        } else if (key === "operatingMode") {
          await nativeClient.setTaskbarReplacement(value === "replacement");
        }

        const next = useSettingsStore.getState().settings;
        await store.current?.set(SETTINGS_KEY, next);
        await store.current?.save();
      } catch (updateError) {
        try {
          if (key === "launchAtLogin") {
            if (previous) await enable(); else await disable();
          } else if (key === "alwaysOnTop") {
            await getCurrentWindow().setAlwaysOnTop(previous as boolean);
          } else if (key === "operatingMode") {
            await nativeClient.setTaskbarReplacement(previous === "replacement");
          } else if (key === "globalShortcut") {
            const shortcut = previousSettings.shortcut;
            if (previous) await register(shortcut, ({ state }) => { if (state === "Pressed") shortcutCallback.current(); });
            else await unregister(shortcut).catch(() => undefined);
          } else if (key === "shortcut" && previousSettings.globalShortcut) {
            await unregister(value as HaminSettings["shortcut"]).catch(() => undefined);
            await register(previous as HaminSettings["shortcut"], ({ state }) => { if (state === "Pressed") shortcutCallback.current(); });
          }
          await store.current?.set(SETTINGS_KEY, previousSettings);
          await store.current?.save();
        } catch (rollbackError) {
          setError(`Could not update setting and rollback was incomplete: ${messageFrom(rollbackError)}`);
        }
        setSettings(previousSettings);
        if (!useSettingsStore.getState().error) setError(`Could not update setting: ${messageFrom(updateError)}`);
      }
      });
      updateQueue.current = operation.catch(() => undefined);
      return operation;
    },
    [patchSettings, setError, setSettings],
  );

  return { settings, ready, error, updateSetting };
}
