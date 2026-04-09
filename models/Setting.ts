import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

export const Setting = mongoose.models.Setting || mongoose.model("Setting", settingSchema);

// Helper functions for typed settings
export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  await mongoose.connection.asPromise();
  const doc = await Setting.findOne({ key });
  return (doc?.value as T) ?? defaultValue;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  await mongoose.connection.asPromise();
  await Setting.findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true }
  );
}

// Ollama-specific settings
export interface OllamaSettings {
  baseUrl: string;
  model: string;
}

export const DEFAULT_OLLAMA_SETTINGS: OllamaSettings = {
  baseUrl: "http://localhost:11434",
  model: "llama3",
};

export async function getOllamaSettings(): Promise<OllamaSettings> {
  const baseUrl = await getSetting("ollama.baseUrl", DEFAULT_OLLAMA_SETTINGS.baseUrl);
  const model = await getSetting("ollama.model", DEFAULT_OLLAMA_SETTINGS.model);
  return { baseUrl, model };
}

export async function setOllamaSettings(settings: OllamaSettings): Promise<void> {
  await setSetting("ollama.baseUrl", settings.baseUrl);
  await setSetting("ollama.model", settings.model);
}