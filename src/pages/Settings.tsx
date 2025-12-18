import { useEffect, useState, useCallback, type ChangeEvent, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import type { BreakConfig } from "../types";

const SETTINGS_STORE = "settings.json";
const SETTINGS_KEY = "break_config";

const DEFAULT_CONFIG: BreakConfig = {
  microbreak_interval: 1800,
  microbreak_duration: 30,
  microbreak_enabled: true,
  rest_interval: 5400,
  rest_duration: 600,
  rest_enabled: true,
  daily_limit: 28800,
  daily_enabled: true,
  warning_duration: 30,
  mode: "Normal",
};

export function Settings() {
  const [config, setConfig] = useState<BreakConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    let finalConfig = { ...DEFAULT_CONFIG };

    try {
      // 1. Try to load from persistent store first
      const store = await load(SETTINGS_STORE, { autoSave: false, defaults: {} });
      const storedConfig = await store.get<BreakConfig>(SETTINGS_KEY);

      if (storedConfig) {
        console.log("Loaded settings from store:", storedConfig);
        finalConfig = { ...finalConfig, ...storedConfig };
        setConfig(finalConfig);
        // Sync with backend to ensure it has the latest values
        await invoke("update_settings", { settings: finalConfig });
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn("Store load failed or empty, falling back to backend:", e);
    }

    // 2. Fall back to backend defaults if store is empty or failed
    try {
      console.log("Loading settings from backend...");
      const backendConfig = await invoke<BreakConfig>("get_settings");
      if (backendConfig) {
        finalConfig = { ...finalConfig, ...backendConfig };
        setConfig(finalConfig);
      } else {
        console.error("Backend returned null settings");
        setConfig(finalConfig);
      }
    } catch (e) {
      console.error("Failed to load settings from backend:", e);
      setConfig(finalConfig);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type, checked, value } = e.target as HTMLInputElement;
    if (!config) return;

    let newValue: string | number | boolean;
    if (type === "checkbox") {
      newValue = checked;
    } else if (type === "number") {
      const numVal = Number(value);
      if (name === "daily_limit") {
        // UI shows hours, store in seconds
        newValue = numVal * 3600;
      } else {
        newValue = numVal;
      }
    } else {
      newValue = value;
    }

    // Update local state
    const updatedConfig = { ...config, [name]: newValue };
    setConfig(updatedConfig);

    // If mode changed, immediately update the backend
    if (name === "mode") {
      // Ensure we send the correct payload structure expected by the backend
      // Rust command: fn set_mode(mode: String)
      invoke("set_mode", { mode: String(newValue) }).catch((err: unknown) => {
        console.error("Failed to set mode", err);
      });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      // Persist to store
      const store = await load(SETTINGS_STORE, { autoSave: false, defaults: {} });
      await store.set(SETTINGS_KEY, config);
      await store.save();

      // Update backend
      await invoke("update_settings", { settings: config });
      alert("Settings saved");
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Error saving settings");
    }
  };

  if (loading) return <div className="text-gray-600 dark:text-gray-400">Loading settings…</div>;
  if (!config) return <div className="text-red-600 dark:text-red-400">Failed to load settings.</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Break Configuration</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Microbreak Interval (s):
            <input type="number" name="microbreak_interval" value={config.microbreak_interval} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          </label>
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Microbreak Duration (s):
            <input type="number" name="microbreak_duration" value={config.microbreak_duration} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="inline-flex items-center text-gray-700 dark:text-gray-300">
            <input type="checkbox" name="microbreak_enabled" checked={config.microbreak_enabled} onChange={handleChange} className="mr-2" />
            Enable Microbreaks
          </label>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 col-span-1 md:col-span-2 my-2"></div>

        <div>
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Rest Interval (s):
            <input type="number" name="rest_interval" value={config.rest_interval} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          </label>
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Rest Duration (s):
            <input type="number" name="rest_duration" value={config.rest_duration} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="inline-flex items-center text-gray-700 dark:text-gray-300">
            <input type="checkbox" name="rest_enabled" checked={config.rest_enabled} onChange={handleChange} className="mr-2" />
            Enable Rest Breaks
          </label>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 col-span-1 md:col-span-2 my-2"></div>

        <div>
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Daily Limit (hours):
            <input
              type="number"
              name="daily_limit"
              value={config.daily_limit / 3600}
              onChange={handleChange}
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </label>
        </div>
        <div>
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Warning Duration (s):
            <input type="number" name="warning_duration" value={config.warning_duration} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          </label>
        </div>
        <div className="md:col-span-2">
          <label className="inline-flex items-center text-gray-700 dark:text-gray-300">
            <input type="checkbox" name="daily_enabled" checked={config.daily_enabled} onChange={handleChange} className="mr-2" />
            Enable Daily Limit
          </label>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 col-span-1 md:col-span-2 my-2"></div>

        <div className="md:col-span-2">
          <label className="block text-gray-700 dark:text-gray-300 mb-2">
            Mode:
            <select name="mode" value={config.mode} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400">
              <option value="Normal">Normal</option>
              <option value="Quiet">Quiet</option>
              <option value="Suspended">Suspended</option>
            </select>
          </label>
        </div>
      </div>
      <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md font-medium transition-colors">
        Save Settings
      </button>
    </form>
  );
}
