/**
 * AI Models Registry
 * Fetches available models from provider APIs and pricing from LiteLLM
 */

import { getSetting, SETTING_KEYS } from "@/lib/settings";

// LiteLLM pricing source - community maintained, updated frequently
const LITELLM_PRICING_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";

// Cache for LiteLLM pricing
let litellmPricingCache: Record<string, { inputPer1M: number; outputPer1M: number }> | null = null;
let litellmPricingCacheTime = 0;
const LITELLM_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch pricing from LiteLLM's community-maintained JSON
 * Falls back to hardcoded pricing if fetch fails
 */
export async function fetchLiteLLMPricing(): Promise<Record<string, { inputPer1M: number; outputPer1M: number }>> {
  const now = Date.now();

  // Return cached if valid
  if (litellmPricingCache && now - litellmPricingCacheTime < LITELLM_CACHE_TTL) {
    return litellmPricingCache;
  }

  try {
    const response = await fetch(LITELLM_PRICING_URL, {
      next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch LiteLLM pricing: ${response.status}`);
    }

    const data = await response.json();
    const pricing: Record<string, { inputPer1M: number; outputPer1M: number }> = {};

    // LiteLLM format: { "model-name": { input_cost_per_token, output_cost_per_token, ... } }
    for (const [modelId, modelData] of Object.entries(data)) {
      const model = modelData as {
        input_cost_per_token?: number;
        output_cost_per_token?: number;
      };

      if (model.input_cost_per_token !== undefined && model.output_cost_per_token !== undefined) {
        // Convert per-token to per-1M tokens
        pricing[modelId] = {
          inputPer1M: model.input_cost_per_token * 1_000_000,
          outputPer1M: model.output_cost_per_token * 1_000_000,
        };
      }
    }

    litellmPricingCache = pricing;
    litellmPricingCacheTime = now;
    console.log(`[models-registry] Loaded ${Object.keys(pricing).length} model prices from LiteLLM`);

    return pricing;
  } catch (error) {
    console.error("[models-registry] Failed to fetch LiteLLM pricing, using fallback:", error);
    // Return fallback pricing
    return MODEL_PRICING_FALLBACK;
  }
}

// Fallback pricing if LiteLLM fetch fails
// Last updated: January 2026
const MODEL_PRICING_FALLBACK: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  // Anthropic - Claude 4.5 series (November 2025)
  "claude-opus-4-5-20251101": { inputPer1M: 5.0, outputPer1M: 25.0 },
  "claude-sonnet-4-5-20251101": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-haiku-4-5-20251101": { inputPer1M: 1.0, outputPer1M: 5.0 },
  // Anthropic - Claude 4.x series
  "claude-opus-4-20250514": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-sonnet-4-20250514": { inputPer1M: 3.0, outputPer1M: 15.0 },
  // Anthropic - Claude 3.x series (legacy)
  "claude-3-5-sonnet-20241022": { inputPer1M: 3.0, outputPer1M: 15.0 },
  "claude-3-5-haiku-20241022": { inputPer1M: 1.0, outputPer1M: 5.0 },
  "claude-3-opus-20240229": { inputPer1M: 15.0, outputPer1M: 75.0 },
  "claude-3-haiku-20240307": { inputPer1M: 0.25, outputPer1M: 1.25 },

  // OpenAI - https://openai.com/api/pricing/
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10.0 },
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4-turbo": { inputPer1M: 10.0, outputPer1M: 30.0 },
  "gpt-4": { inputPer1M: 30.0, outputPer1M: 60.0 },
  "gpt-3.5-turbo": { inputPer1M: 0.5, outputPer1M: 1.5 },
  "o1": { inputPer1M: 15.0, outputPer1M: 60.0 },
  "o1-preview": { inputPer1M: 15.0, outputPer1M: 60.0 },
  "o1-mini": { inputPer1M: 3.0, outputPer1M: 12.0 },
  "o3-mini": { inputPer1M: 1.1, outputPer1M: 4.4 },

  // Google Gemini 3 (Preview - November 2025)
  "gemini-3-pro": { inputPer1M: 2.0, outputPer1M: 12.0 },
  "gemini-3-pro-preview": { inputPer1M: 2.0, outputPer1M: 12.0 },
  "gemini-3-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gemini-3-flash-preview": { inputPer1M: 0.15, outputPer1M: 0.6 },
  // Google Gemini 2.5
  "gemini-2.5-pro": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-2.5-pro-preview": { inputPer1M: 1.25, outputPer1M: 10.0 },
  "gemini-2.5-flash": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gemini-2.5-flash-preview": { inputPer1M: 0.15, outputPer1M: 0.6 },
  // Google Gemini 2.0
  "gemini-2.0-pro": { inputPer1M: 1.0, outputPer1M: 4.0 },
  "gemini-2.0-pro-exp": { inputPer1M: 1.0, outputPer1M: 4.0 },
  "gemini-2.0-flash": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.0-flash-exp": { inputPer1M: 0.1, outputPer1M: 0.4 },
  "gemini-2.0-flash-lite": { inputPer1M: 0.075, outputPer1M: 0.3 },
  // Google Gemini 1.5
  "gemini-1.5-pro": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-1.5-pro-latest": { inputPer1M: 1.25, outputPer1M: 5.0 },
  "gemini-1.5-flash": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-flash-latest": { inputPer1M: 0.075, outputPer1M: 0.3 },
  "gemini-1.5-flash-8b": { inputPer1M: 0.0375, outputPer1M: 0.15 },
  "gemini-pro": { inputPer1M: 0.5, outputPer1M: 1.5 },
};

// Export for backwards compatibility (synchronous access to fallback)
export const MODEL_PRICING = MODEL_PRICING_FALLBACK;

// Model descriptions - specific task recommendations
export const MODEL_DESCRIPTIONS: Record<string, { bestFor: string; strengths: string[]; tier: string }> = {
  // Claude 4.5 series
  "claude-opus-4-5": {
    bestFor: "🎨 Творче написання, складний код, глибокий аналіз",
    strengths: ["Творчість", "Нюанси", "Складний код"],
    tier: "premium",
  },
  "claude-sonnet-4-5": {
    bestFor: "📝 Написання резюме, редагування тексту, форматування",
    strengths: ["Текст", "Структура", "Швидкість"],
    tier: "quality",
  },
  "claude-haiku-4-5": {
    bestFor: "⚡ Парсинг PDF, класифікація, швидкі правки",
    strengths: ["Парсинг", "Швидкість", "Ціна"],
    tier: "fast",
  },
  // Claude 4 series
  "claude-sonnet-4": {
    bestFor: "📝 Генерація контенту резюме, покращення тексту",
    strengths: ["Текст", "Код", "Аналіз"],
    tier: "quality",
  },
  // Claude 3.5 series
  "claude-3-5-sonnet": {
    bestFor: "📝 Написання резюме, аналіз вакансій, форматування",
    strengths: ["Текст", "Форматування", "Надійність"],
    tier: "quality",
  },
  "claude-3-5-haiku": {
    bestFor: "⚡ Швидкий парсинг, прості виправлення, класифікація",
    strengths: ["Швидкість", "Ціна", "Парсинг"],
    tier: "fast",
  },
  // GPT-4o series
  "gpt-4o": {
    bestFor: "🖼️ Аналіз зображень + текст, мультимодальні задачі",
    strengths: ["Візуал", "Текст", "Універсальність"],
    tier: "quality",
  },
  "gpt-4o-mini": {
    bestFor: "⚡ Швидкі текстові задачі, базова генерація",
    strengths: ["Ціна", "Швидкість", "Простота"],
    tier: "fast",
  },
  // GPT-4
  "gpt-4-turbo": {
    bestFor: "📚 Аналіз великих документів (128K контекст)",
    strengths: ["Контекст", "Аналіз", "Надійність"],
    tier: "quality",
  },
  "gpt-4": {
    bestFor: "🏛️ Legacy задачі, сумісність зі старими промптами",
    strengths: ["Стабільність", "Передбачуваність"],
    tier: "premium",
  },
  // OpenAI o1/o3 reasoning
  "o1": {
    bestFor: "🧮 Математика, логічні задачі, складні обчислення",
    strengths: ["Математика", "Логіка", "Точність"],
    tier: "reasoning",
  },
  "o1-preview": {
    bestFor: "🔬 Наукові задачі, дослідження, складний аналіз",
    strengths: ["Наука", "Аналітика", "Глибина"],
    tier: "reasoning",
  },
  "o1-mini": {
    bestFor: "🧮 Базова математика та логіка, економно",
    strengths: ["Логіка", "Ціна", "Швидкість"],
    tier: "reasoning",
  },
  "o3-mini": {
    bestFor: "🧠 Новітнє міркування, code review, дебаг",
    strengths: ["Код", "Міркування", "Ефективність"],
    tier: "reasoning",
  },
  // Gemini 3 series
  "gemini-3-pro": {
    bestFor: "🚀 Найновіші можливості Google, експерименти",
    strengths: ["Новизна", "Потужність", "Контекст"],
    tier: "quality",
  },
  "gemini-3-flash": {
    bestFor: "⚡ Швидкі задачі з новими фічами Google",
    strengths: ["Швидкість", "Новизна", "Ціна"],
    tier: "fast",
  },
  // Gemini 2.5 series
  "gemini-2.5-pro": {
    bestFor: "🤔 Складні задачі з покроковим міркуванням",
    strengths: ["Thinking", "Контекст 1M", "Аналіз"],
    tier: "quality",
  },
  "gemini-2.5-flash": {
    bestFor: "⚡ Швидкі задачі, можна ввімкнути reasoning",
    strengths: ["Швидкість", "Гнучкість", "Ціна"],
    tier: "fast",
  },
  // Gemini 2.0 series
  "gemini-2.0-pro": {
    bestFor: "🖼️ Мультимодальний аналіз: текст + зображення + аудіо",
    strengths: ["Мультимодальність", "Якість"],
    tier: "quality",
  },
  "gemini-2.0-flash": {
    bestFor: "⚡ Найдешевший для простих задач, парсинг, класифікація",
    strengths: ["Ціна $0.10/1M", "Швидкість"],
    tier: "fast",
  },
  // Gemini 1.5 series
  "gemini-1.5-pro": {
    bestFor: "📚 Аналіз ДУЖЕ великих документів (до 2M токенів!)",
    strengths: ["Контекст 2M", "Документи", "Аналіз"],
    tier: "quality",
  },
  "gemini-1.5-flash": {
    bestFor: "⚡ Швидкий парсинг, базова генерація, стабільна робота",
    strengths: ["Стабільність", "Ціна", "Швидкість"],
    tier: "fast",
  },
};

/**
 * Get description for a model
 */
export function getModelDescription(modelId: string): { bestFor: string; strengths: string[]; tier: string } | null {
  // Exact match
  if (MODEL_DESCRIPTIONS[modelId]) {
    return MODEL_DESCRIPTIONS[modelId];
  }

  // Try base name (without version suffix)
  for (const key of Object.keys(MODEL_DESCRIPTIONS)) {
    if (modelId.startsWith(key) || modelId.includes(key)) {
      return MODEL_DESCRIPTIONS[key];
    }
  }

  return null;
}

// Model tier classification
function classifyModelTier(modelId: string): "fast" | "quality" | "premium" | "reasoning" {
  const lowerModel = modelId.toLowerCase();

  // Fast/cheap models
  if (lowerModel.includes("haiku") || lowerModel.includes("mini") || lowerModel.includes("flash") || lowerModel.includes("3.5-turbo")) {
    return "fast";
  }

  // Reasoning models
  if (lowerModel.includes("o1-") || lowerModel.includes("reasoning")) {
    return "reasoning";
  }

  // Premium models
  if (lowerModel.includes("opus") || lowerModel.includes("gpt-4-turbo") || lowerModel.includes("gpt-4") && !lowerModel.includes("4o")) {
    return "premium";
  }

  // Quality models (default for sonnet, gpt-4o, gemini-pro)
  return "quality";
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: "anthropic" | "openai" | "google";
  tier: "fast" | "quality" | "premium" | "reasoning";
  inputPer1M: number;
  outputPer1M: number;
  contextWindow?: number;
  maxOutput?: number;
}

// Fetch models from Anthropic API
async function fetchAnthropicModels(): Promise<ModelInfo[]> {
  const apiKey = await getSetting(SETTING_KEYS.ANTHROPIC_API_KEY);
  if (!apiKey) return [];

  try {
    // Anthropic doesn't have a public models endpoint, so we use known models
    const knownModels = [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    ];

    return knownModels.map((m) => ({
      id: m.id,
      name: m.name,
      provider: "anthropic" as const,
      tier: classifyModelTier(m.id),
      inputPer1M: MODEL_PRICING[m.id]?.inputPer1M ?? 1.0,
      outputPer1M: MODEL_PRICING[m.id]?.outputPer1M ?? 3.0,
    }));
  } catch (error) {
    console.error("Error fetching Anthropic models:", error);
    return [];
  }
}

// Fetch models from OpenAI API
async function fetchOpenAIModels(): Promise<ModelInfo[]> {
  const apiKey = await getSetting(SETTING_KEYS.OPENAI_API_KEY);
  if (!apiKey) return [];

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const models: ModelInfo[] = [];

    // Filter for chat models we care about
    const relevantModels = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo", "o1-preview", "o1-mini"];

    for (const model of data.data || []) {
      const modelId = model.id;

      // Check if this is a relevant model (exact match or starts with)
      const isRelevant = relevantModels.some(
        (rm) => modelId === rm || modelId.startsWith(`${rm}-`)
      );

      if (!isRelevant) continue;

      // Skip dated versions, prefer base names
      if (modelId.match(/-\d{4}$/) && relevantModels.includes(modelId.replace(/-\d{4}$/, ""))) {
        continue;
      }

      // Find pricing using helper function
      const pricing = findModelPricing(modelId);

      models.push({
        id: modelId,
        name: formatModelName(modelId),
        provider: "openai",
        tier: classifyModelTier(modelId),
        inputPer1M: pricing?.inputPer1M ?? 1.0,
        outputPer1M: pricing?.outputPer1M ?? 3.0,
      });
    }

    // Deduplicate by base name, preferring models without date suffix
    const seen = new Set<string>();
    return models.filter((m) => {
      const baseName = m.id.replace(/-\d{4,}.*$/, "");
      if (seen.has(baseName)) return false;
      seen.add(baseName);
      return true;
    });
  } catch (error) {
    console.error("Error fetching OpenAI models:", error);
    // Return fallback
    return [
      { id: "gpt-4o", name: "GPT-4o", provider: "openai", tier: "quality", inputPer1M: 2.5, outputPer1M: 10.0 },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", tier: "fast", inputPer1M: 0.15, outputPer1M: 0.6 },
    ];
  }
}

// Fetch models from Google AI API
async function fetchGoogleModels(): Promise<ModelInfo[]> {
  const apiKey = await getSetting(SETTING_KEYS.GOOGLE_AI_API_KEY);
  if (!apiKey) return [];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json();
    const models: ModelInfo[] = [];

    for (const model of data.models || []) {
      // Only include generateContent capable models
      if (!model.supportedGenerationMethods?.includes("generateContent")) {
        continue;
      }

      // Extract model name (e.g., "models/gemini-1.5-pro" -> "gemini-1.5-pro")
      const modelId = model.name.replace("models/", "");

      // Skip embedding, vision-only, and deprecated models
      if (modelId.includes("embedding") || modelId.includes("vision") || modelId.includes("001")) {
        continue;
      }

      const pricing = findModelPricing(modelId);

      models.push({
        id: modelId,
        name: model.displayName || formatModelName(modelId),
        provider: "google",
        tier: classifyModelTier(modelId),
        inputPer1M: pricing?.inputPer1M ?? 0.5,
        outputPer1M: pricing?.outputPer1M ?? 1.5,
        contextWindow: model.inputTokenLimit,
        maxOutput: model.outputTokenLimit,
      });
    }

    return models;
  } catch (error) {
    console.error("Error fetching Google models:", error);
    // Return fallback
    return [
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", tier: "quality", inputPer1M: 1.25, outputPer1M: 5.0 },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", tier: "fast", inputPer1M: 0.075, outputPer1M: 0.3 },
    ];
  }
}

// Format model ID to human-readable name
function formatModelName(modelId: string): string {
  return modelId
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Gpt/g, "GPT")
    .replace(/(\d)O/g, "$1o")
    .replace(/Gemini/g, "Gemini")
    .replace(/Claude/g, "Claude");
}

// Find pricing for a model from a pricing map, with fallback to base model name matching
function findModelPricingFromMap(
  modelId: string,
  pricingMap: Record<string, { inputPer1M: number; outputPer1M: number }>
): { inputPer1M: number; outputPer1M: number } | null {
  // Exact match first
  if (pricingMap[modelId]) {
    return pricingMap[modelId];
  }

  // Try removing version suffixes like -002, -001, -latest, -exp, -preview
  const baseId = modelId.replace(/-(latest|exp|preview|\d{3,})$/, "");
  if (pricingMap[baseId]) {
    return pricingMap[baseId];
  }

  // Try matching by prefix (e.g., "gemini-2.0-flash-exp" -> check if starts with known model)
  for (const pricingId of Object.keys(pricingMap)) {
    if (modelId.startsWith(pricingId)) {
      return pricingMap[pricingId];
    }
  }

  return null;
}

// Sync version using fallback (for backwards compatibility)
function findModelPricing(modelId: string): { inputPer1M: number; outputPer1M: number } | null {
  return findModelPricingFromMap(modelId, MODEL_PRICING_FALLBACK);
}

// Cache for models (5 minute TTL)
let modelsCache: ModelInfo[] | null = null;
let modelsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get all available models from all providers
 * Fetches from APIs and caches results
 */
export async function getAllModels(forceRefresh = false): Promise<ModelInfo[]> {
  const now = Date.now();

  if (!forceRefresh && modelsCache && now - modelsCacheTime < CACHE_TTL) {
    return modelsCache;
  }

  try {
    const [anthropicModels, openaiModels, googleModels] = await Promise.all([
      fetchAnthropicModels(),
      fetchOpenAIModels(),
      fetchGoogleModels(),
    ]);

    modelsCache = [...anthropicModels, ...openaiModels, ...googleModels];
    modelsCacheTime = now;

    return modelsCache;
  } catch (error) {
    console.error("Error fetching models:", error);

    // Return cache if available, otherwise empty
    return modelsCache || [];
  }
}

/**
 * Get models grouped by provider
 */
export async function getModelsByProvider(): Promise<Record<string, ModelInfo[]>> {
  const models = await getAllModels();

  return {
    anthropic: models.filter((m) => m.provider === "anthropic"),
    openai: models.filter((m) => m.provider === "openai"),
    google: models.filter((m) => m.provider === "google"),
  };
}

/**
 * Get pricing for a specific model (sync - uses fallback)
 */
export function getModelPricing(modelId: string): { inputPer1M: number; outputPer1M: number } {
  return findModelPricing(modelId) || { inputPer1M: 1.0, outputPer1M: 3.0 };
}

/**
 * Get pricing for a specific model (async - fetches from LiteLLM)
 */
export async function getModelPricingAsync(modelId: string): Promise<{ inputPer1M: number; outputPer1M: number }> {
  const pricingMap = await fetchLiteLLMPricing();
  return findModelPricingFromMap(modelId, pricingMap) || { inputPer1M: 1.0, outputPer1M: 3.0 };
}

/**
 * Get all pricing data (async - fetches from LiteLLM)
 */
export async function getAllPricing(): Promise<Record<string, { inputPer1M: number; outputPer1M: number }>> {
  return fetchLiteLLMPricing();
}
