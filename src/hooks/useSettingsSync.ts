import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import type { BreakConfig } from "../types";

const SETTINGS_STORE = "settings.json";
const SETTINGS_KEY = "break_config";

export function useSettingsSync() {
  useEffect(() => {
    async function syncSettings() {
      try {
        const store = await load(SETTINGS_STORE, { autoSave: false, defaults: {} });
        const storedConfig = await store.get<BreakConfig>(SETTINGS_KEY);

        if (storedConfig) {
          // Sync with backend immediately on startup
          // This ensures that even if the user doesn't visit the Settings page,
          // the backend uses the persisted settings.
          await invoke("update_settings", { settings: storedConfig });
          console.log("Global settings synced with backend on startup");
        } else {
          console.log("No stored settings found on startup, using backend defaults.");
        }
      } catch (e) {
        console.warn("Startup settings sync failed:", e);
      }
    }

    syncSettings();
  }, []);
}
