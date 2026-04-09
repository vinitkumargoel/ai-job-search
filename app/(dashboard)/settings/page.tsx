"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface OllamaSettings {
  baseUrl: string;
  model: string;
}

interface SettingsResponse {
  settings: OllamaSettings;
  models: string[];
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [settings, setSettings] = useState<OllamaSettings>({ baseUrl: "", model: "" });
  const [models, setModels] = useState<string[]>([]);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);
  const { toast } = useToast();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/ollama");
      if (res.ok) {
        const data: SettingsResponse = await res.json();
        setSettings(data.settings);
        setModels(data.models);
        setConnectionOk(data.models.length > 0);
      }
    } catch {
      toast("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const testConnection = async () => {
    if (!settings.baseUrl.trim()) {
      toast("Please enter a URL", "error");
      return;
    }
    setTesting(true);
    setFetchingModels(true);
    try {
      const res = await fetch(`/api/settings/ollama?testUrl=${encodeURIComponent(settings.baseUrl)}`);
      if (res.ok) {
        const data: SettingsResponse = await res.json();
        setModels(data.models);
        setConnectionOk(data.models.length > 0);
        if (data.models.length > 0) {
          toast(`Connected! ${data.models.length} models available`, "success");
          // Auto-select first model if current model not in list
          if (!data.models.includes(settings.model) && data.models.length > 0) {
            setSettings({ ...settings, model: data.models[0] });
          }
        } else {
          toast("Connected but no models found", "error");
        }
      } else {
        setConnectionOk(false);
        setModels([]);
        toast("Connection failed", "error");
      }
    } catch {
      setConnectionOk(false);
      setModels([]);
      toast("Connection failed", "error");
    } finally {
      setTesting(false);
      setFetchingModels(false);
    }
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings/ollama", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast("Settings saved", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to save settings", "error");
      }
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 text-sm mt-1">Configure Ollama connection for AI features</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
          <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
        </div>
      ) : (
        <form onSubmit={saveSettings} className="space-y-6">
          {/* Connection Status */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Ollama Connection</h2>
              {connectionOk !== null && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                  connectionOk
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${connectionOk ? "bg-green-500" : "bg-red-500"}`} />
                  {connectionOk ? "Connected" : "Disconnected"}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <input
                type="url"
                value={settings.baseUrl}
                onChange={(e) => {
                  setSettings({ ...settings, baseUrl: e.target.value });
                  setConnectionOk(null);
                }}
                placeholder="http://localhost:11434"
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6AF5] focus:border-transparent"
              />
              <button
                type="button"
                onClick={testConnection}
                disabled={testing || !settings.baseUrl}
                className="px-4 py-2.5 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {testing ? "Testing..." : "Test"}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Ollama API endpoint URL. Default: http://localhost:11434
            </p>
          </div>

          {/* Model Selection */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Model Selection</h2>
            {models.length > 0 ? (
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6AF5] focus:border-transparent bg-white"
              >
                {models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <div className="text-sm text-gray-500">
                {connectionOk === false
                  ? "Connect to Ollama to see available models"
                  : fetchingModels
                    ? "Fetching models..."
                    : "No models found. Make sure Ollama is running."}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">
              This model will be used for job enrichment and resume matching.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !settings.baseUrl || !settings.model}
              className="px-6 py-2.5 bg-[#4F6AF5] text-white text-sm font-semibold rounded-lg hover:bg-[#3B56E0] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}