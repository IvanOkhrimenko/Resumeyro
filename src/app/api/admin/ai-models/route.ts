import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin, getSetting, SETTING_KEYS } from "@/lib/settings";

interface ModelInfo {
  id: string;
  name: string;
  tier: string;
  contextWindow?: number;
  description?: string;
}

// Fallback models when API is not available
const FALLBACK_MODELS: Record<string, ModelInfo[]> = {
  openai: [
    { id: "gpt-4o", name: "GPT-4o", tier: "quality", contextWindow: 128000 },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", tier: "fast", contextWindow: 128000 },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", tier: "premium", contextWindow: 128000 },
    { id: "gpt-4", name: "GPT-4", tier: "quality", contextWindow: 8192 },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", tier: "fast", contextWindow: 16385 },
    { id: "o1-preview", name: "o1 Preview", tier: "reasoning", contextWindow: 128000 },
    { id: "o1-mini", name: "o1 Mini", tier: "reasoning", contextWindow: 128000 },
  ],
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", tier: "quality", contextWindow: 200000 },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", tier: "fast", contextWindow: 200000 },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", tier: "premium", contextWindow: 200000 },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", tier: "quality", contextWindow: 200000 },
  ],
  google: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tier: "premium", contextWindow: 1000000 },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tier: "fast", contextWindow: 1000000 },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", tier: "fast", contextWindow: 1000000 },
    { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro", tier: "quality", contextWindow: 1000000 },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", tier: "quality", contextWindow: 1000000 },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", tier: "fast", contextWindow: 1000000 },
  ],
};

// Fetch OpenAI models
async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error("OpenAI API error:", res.status);
      return FALLBACK_MODELS.openai;
    }

    const data = await res.json();
    const models: ModelInfo[] = [];

    // Filter and map relevant models
    const relevantPrefixes = ["gpt-4", "gpt-3.5", "o1"];

    for (const model of data.data) {
      const id = model.id as string;

      // Skip fine-tuned, deprecated, and non-chat models
      if (id.includes(":ft-") || id.includes("instruct") || id.includes("0301") || id.includes("0314")) {
        continue;
      }

      if (relevantPrefixes.some((prefix) => id.startsWith(prefix))) {
        let tier = "quality";
        if (id.includes("mini") || id.includes("3.5")) tier = "fast";
        if (id.includes("turbo")) tier = "quality";
        if (id === "gpt-4" || id.includes("opus")) tier = "premium";
        if (id.startsWith("o1")) tier = "reasoning";

        models.push({
          id,
          name: formatModelName(id),
          tier,
        });
      }
    }

    // Sort: premium first, then quality, then fast
    const tierOrder = { premium: 0, reasoning: 1, quality: 2, fast: 3 };
    models.sort((a, b) => (tierOrder[a.tier as keyof typeof tierOrder] || 4) - (tierOrder[b.tier as keyof typeof tierOrder] || 4));

    return models.length > 0 ? models : FALLBACK_MODELS.openai;
  } catch (error) {
    console.error("Failed to fetch OpenAI models:", error);
    return FALLBACK_MODELS.openai;
  }
}

// Fetch Anthropic models (they don't have a public models API, use fallback)
async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  // Anthropic doesn't have a public models listing API
  // We could try to validate the key with a simple request
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1,
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    // If we get 401, key is invalid
    if (res.status === 401) {
      return [];
    }

    // Key is valid, return fallback models
    return FALLBACK_MODELS.anthropic;
  } catch {
    return FALLBACK_MODELS.anthropic;
  }
}

// Known working Google models (tested with @ai-sdk/google)
const SUPPORTED_GOOGLE_MODELS = new Set([
  // Gemini 2.5 (latest)
  "gemini-2.5-flash-preview-05-20",
  "gemini-2.5-pro-preview-05-06",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  // Gemini 2.0
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash-lite",
  "gemini-2.0-pro",
  "gemini-2.0-pro-exp",
  // Gemini 1.5
  "gemini-1.5-pro",
  "gemini-1.5-pro-latest",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-8b",
]);

// Fetch Google AI models - returns all Gemini models from API
async function fetchGoogleModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!res.ok) {
      console.error("Google AI API error:", res.status);
      return FALLBACK_MODELS.google;
    }

    const data = await res.json();
    const models: ModelInfo[] = [];

    for (const model of data.models || []) {
      const name = model.name as string;
      const id = name.replace("models/", "");

      // Only include Gemini models (skip embedding, text-bison, etc.)
      if (!id.startsWith("gemini")) continue;

      // Skip deprecated/old versions (ones with specific dates in the name that aren't latest)
      if (id.match(/-\d{3}$/) && !id.includes("latest")) continue;

      let tier = "quality";
      if (id.includes("flash") || id.includes("lite")) tier = "fast";
      if (id.includes("pro") && !id.includes("flash")) tier = "quality";
      if (id.includes("2.5") || id.includes("ultra")) tier = "premium";

      models.push({
        id,
        name: model.displayName || formatModelName(id),
        tier,
        description: model.description,
      });
    }

    // Sort: newer versions first, pro before flash
    models.sort((a, b) => {
      // Sort by version (2.5 > 2.0 > 1.5)
      const versionA = a.id.match(/gemini-(\d+\.?\d*)/)?.[1] || "0";
      const versionB = b.id.match(/gemini-(\d+\.?\d*)/)?.[1] || "0";
      if (versionA !== versionB) return parseFloat(versionB) - parseFloat(versionA);

      // Then pro before flash
      if (a.id.includes("pro") && !b.id.includes("pro")) return -1;
      if (!a.id.includes("pro") && b.id.includes("pro")) return 1;
      return a.id.localeCompare(b.id);
    });

    return models.length > 0 ? models : FALLBACK_MODELS.google;
  } catch (error) {
    console.error("Failed to fetch Google models:", error);
    return FALLBACK_MODELS.google;
  }
}

function formatModelName(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace("Gpt", "GPT")
    .replace("O1", "o1");
}

// GET /api/admin/ai-models?provider=openai
export async function GET(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      // Return all providers with their models
      const [openaiKey, anthropicKey, googleKey] = await Promise.all([
        getSetting(SETTING_KEYS.OPENAI_API_KEY),
        getSetting(SETTING_KEYS.ANTHROPIC_API_KEY),
        getSetting(SETTING_KEYS.GOOGLE_AI_API_KEY),
      ]);

      const results: Record<string, { models: ModelInfo[]; hasKey: boolean; error?: string }> = {};

      // Fetch in parallel
      const [openaiModels, anthropicModels, googleModels] = await Promise.all([
        openaiKey ? fetchOpenAIModels(openaiKey) : Promise.resolve(FALLBACK_MODELS.openai),
        anthropicKey ? fetchAnthropicModels(anthropicKey) : Promise.resolve(FALLBACK_MODELS.anthropic),
        googleKey ? fetchGoogleModels(googleKey) : Promise.resolve(FALLBACK_MODELS.google),
      ]);

      results.openai = { models: openaiModels, hasKey: !!openaiKey };
      results.anthropic = { models: anthropicModels, hasKey: !!anthropicKey };
      results.google = { models: googleModels, hasKey: !!googleKey };

      return NextResponse.json(results);
    }

    // Fetch models for specific provider
    let apiKey: string | null = null;
    let models: ModelInfo[] = [];

    switch (provider) {
      case "openai":
        apiKey = await getSetting(SETTING_KEYS.OPENAI_API_KEY);
        models = apiKey ? await fetchOpenAIModels(apiKey) : FALLBACK_MODELS.openai;
        break;
      case "anthropic":
        apiKey = await getSetting(SETTING_KEYS.ANTHROPIC_API_KEY);
        models = apiKey ? await fetchAnthropicModels(apiKey) : FALLBACK_MODELS.anthropic;
        break;
      case "google":
        apiKey = await getSetting(SETTING_KEYS.GOOGLE_AI_API_KEY);
        models = apiKey ? await fetchGoogleModels(apiKey) : FALLBACK_MODELS.google;
        break;
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    return NextResponse.json({
      provider,
      models,
      hasKey: !!apiKey,
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
