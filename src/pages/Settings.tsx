import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { BreakConfig } from "../types";

export function Settings() {
  const [config, setConfig] = useState<BreakConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<BreakConfig>("get_settings")
      .then((c: BreakConfig) => {
        setConfig(c);
        setLoading(false);
      })
      .catch((e: unknown) => {
        console.error("Failed to load settings", e);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type, checked, value } = e.target as HTMLInputElement;
    if (!config) return;
    const newValue = type === "checkbox" ? checked : Number(value);
    setConfig({ ...config, [name]: newValue });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!config) return;
    invoke("update_settings", { settings: config })
      .then(() => {
        alert("Settings saved");
      })
      .catch((err: unknown) => {
        console.error("Failed to save settings", err);
        alert("Error saving settings");
      });
  };

  if (loading) return <div>Loading settings…</div>;
  if (!config) return <div>Failed to load settings.</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold">Break Configuration</h2>
      <div>
        <label className="block">
          Microbreak Interval (s):
          <input type="number" name="microbreak_interval" value={config.microbreak_interval} onChange={handleChange} className="input" />
        </label>
      </div>
      <div>
        <label className="block">
          Microbreak Duration (s):
          <input type="number" name="microbreak_duration" value={config.microbreak_duration} onChange={handleChange} className="input" />
        </label>
      </div>
      <div>
        <label className="inline-flex items-center">
          <input type="checkbox" name="microbreak_enabled" checked={config.microbreak_enabled} onChange={handleChange} className="mr-2" />
          Enable Microbreaks
        </label>
      </div>
      <div>
        <label className="block">
          Rest Interval (s):
          <input type="number" name="rest_interval" value={config.rest_interval} onChange={handleChange} className="input" />
        </label>
      </div>
      <div>
        <label className="block">
          Rest Duration (s):
          <input type="number" name="rest_duration" value={config.rest_duration} onChange={handleChange} className="input" />
        </label>
      </div>
      <div>
        <label className="inline-flex items-center">
          <input type="checkbox" name="rest_enabled" checked={config.rest_enabled} onChange={handleChange} className="mr-2" />
          Enable Rest Breaks
        </label>
      </div>
      <div>
        <label className="block">
          Daily Limit (s):
          <input type="number" name="daily_limit" value={config.daily_limit} onChange={handleChange} className="input" />
        </label>
      </div>
      <div>
        <label className="inline-flex items-center">
          <input type="checkbox" name="daily_enabled" checked={config.daily_enabled} onChange={handleChange} className="mr-2" />
          Enable Daily Limit
        </label>
      </div>
      <div>
        <label className="block">
          Warning Duration (s):
          <input type="number" name="warning_duration" value={config.warning_duration} onChange={handleChange} className="input" />
        </label>
      </div>
      <div>
        <label className="block">
          Mode:
          <select name="mode" value={config.mode} onChange={handleChange} className="input">
            <option value="Normal">Normal</option>
            <option value="Quiet">Quiet</option>
            <option value="Suspended">Suspended</option>
          </select>
        </label>
      </div>
      <button type="submit" className="btn-primary">
        Save Settings
      </button>
    </form>
  );
}
