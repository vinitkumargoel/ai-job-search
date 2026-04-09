import { NextRequest, NextResponse } from "next/server";
import { getOllamaSettings, setOllamaSettings } from "@/models/Setting";
import { getSession } from "@/lib/auth";
import { clearOllamaSettingsCache } from "@/lib/ollama";

// GET - Fetch current Ollama settings and available models
// Query params:
//   - testUrl: optional URL to test (instead of saved settings)
export async function GET(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const testUrl = searchParams.get("testUrl");

    const settings = await getOllamaSettings();
    const baseUrlToUse = testUrl || settings.baseUrl;

    // Try to fetch available models from Ollama
    let models: string[] = [];
    try {
      const response = await fetch(`${baseUrlToUse}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json();
        models = data.models?.map((m: { name: string }) => m.name) ?? [];
      }
    } catch {
      // Ollama might not be reachable, return empty models list
    }

    return NextResponse.json({ settings, models });
  } catch (error) {
    console.error("[Ollama Settings GET] Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT - Update Ollama settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { baseUrl, model } = body;

    if (!baseUrl || typeof baseUrl !== "string") {
      return NextResponse.json({ error: "baseUrl is required" }, { status: 400 });
    }

    if (!model || typeof model !== "string") {
      return NextResponse.json({ error: "model is required" }, { status: 400 });
    }

    // Validate baseUrl is a valid URL
    try {
      new URL(baseUrl);
    } catch {
      return NextResponse.json({ error: "Invalid baseUrl format" }, { status: 400 });
    }

    await setOllamaSettings({ baseUrl, model });
    clearOllamaSettingsCache();

    return NextResponse.json({ success: true, settings: { baseUrl, model } });
  } catch (error) {
    console.error("[Ollama Settings PUT] Error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}