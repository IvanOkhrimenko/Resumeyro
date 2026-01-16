import { db } from "./db";
import type { AITaskType, Prisma } from "@prisma/client";

// AI Provider options
export const AI_PROVIDERS = {
  OPENAI: "openai",
  ANTHROPIC: "anthropic",
  GOOGLE: "google",
  CUSTOM: "custom",
} as const;

export type AIProvider = (typeof AI_PROVIDERS)[keyof typeof AI_PROVIDERS];

// AI Task Types - mirrors Prisma enum
export const AI_TASK_TYPES = {
  RESUME_PARSING: "RESUME_PARSING",
  RESUME_GENERATION: "RESUME_GENERATION",
  TEXT_IMPROVEMENT: "TEXT_IMPROVEMENT",
  RESUME_REVIEW: "RESUME_REVIEW",
  STYLE_FORMATTING: "STYLE_FORMATTING",
  IMAGE_GENERATION: "IMAGE_GENERATION",
  TRANSLATION: "TRANSLATION",
} as const;

// Available models per provider
export const AI_MODELS = {
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", tier: "quality" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", tier: "fast" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", tier: "premium" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", tier: "quality" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", tier: "fast" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", tier: "premium" },
    { id: "o1-preview", name: "o1 Preview", tier: "reasoning" },
  ],
  google: [
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", tier: "quality" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", tier: "fast" },
  ],
} as const;

// Task type metadata for UI
export const AI_TASK_METADATA: Record<AITaskType, { name: string; nameUk: string; description: string }> = {
  RESUME_PARSING: {
    name: "Resume Parsing",
    nameUk: "Парсинг резюме",
    description: "Extract structured data from uploaded PDFs and documents",
  },
  RESUME_GENERATION: {
    name: "Resume Generation",
    nameUk: "Генерація резюме",
    description: "Generate complete resumes from user prompts",
  },
  TEXT_IMPROVEMENT: {
    name: "Text Improvement",
    nameUk: "Покращення тексту",
    description: "Rewrite, expand, or improve text content",
  },
  RESUME_REVIEW: {
    name: "Resume Review",
    nameUk: "Ревью резюме",
    description: "Analyze and score resumes with feedback",
  },
  STYLE_FORMATTING: {
    name: "Style & Formatting",
    nameUk: "Стилі та форматування",
    description: "Creative style suggestions with higher creativity settings",
  },
  IMAGE_GENERATION: {
    name: "Image Generation",
    nameUk: "Генерація зображень",
    description: "Generate images for resumes or profiles",
  },
  TRANSLATION: {
    name: "Translation",
    nameUk: "Переклад",
    description: "Translate resume content between languages",
  },
};

// Default task configurations
export const DEFAULT_TASK_CONFIGS: Record<AITaskType, { provider: string; modelId: string; temperature: number; maxTokens: number }> = {
  RESUME_PARSING: { provider: "anthropic", modelId: "claude-sonnet-4-20250514", temperature: 0.1, maxTokens: 4000 },
  RESUME_GENERATION: { provider: "anthropic", modelId: "claude-sonnet-4-20250514", temperature: 0.3, maxTokens: 4000 },
  TEXT_IMPROVEMENT: { provider: "anthropic", modelId: "claude-3-5-haiku-20241022", temperature: 0.7, maxTokens: 2000 },
  RESUME_REVIEW: { provider: "anthropic", modelId: "claude-sonnet-4-20250514", temperature: 0.2, maxTokens: 6000 },
  STYLE_FORMATTING: { provider: "anthropic", modelId: "claude-sonnet-4-20250514", temperature: 0.8, maxTokens: 3000 }, // Higher creativity
  IMAGE_GENERATION: { provider: "openai", modelId: "dall-e-3", temperature: 1.0, maxTokens: 0 },
  TRANSLATION: { provider: "anthropic", modelId: "claude-3-5-haiku-20241022", temperature: 0.3, maxTokens: 4000 },
};

// Setting keys
export const SETTING_KEYS = {
  AI_PROVIDER: "AI_PROVIDER",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  ANTHROPIC_API_KEY: "ANTHROPIC_API_KEY",
  GOOGLE_AI_API_KEY: "GOOGLE_AI_API_KEY",
  STRIPE_SECRET_KEY: "STRIPE_SECRET_KEY",
  STRIPE_WEBHOOK_SECRET: "STRIPE_WEBHOOK_SECRET",
  STRIPE_PUBLISHABLE_KEY: "STRIPE_PUBLISHABLE_KEY",
  STRIPE_PRO_PRICE_ID: "STRIPE_PRO_PRICE_ID",
  STRIPE_PREMIUM_PRICE_ID: "STRIPE_PREMIUM_PRICE_ID",
  GOOGLE_CLIENT_ID: "GOOGLE_CLIENT_ID",
  GOOGLE_CLIENT_SECRET: "GOOGLE_CLIENT_SECRET",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// Mask secret for display (show first 4 and last 4 chars)
function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return "*".repeat(secret.length);
  }
  return secret.slice(0, 4) + "*".repeat(secret.length - 8) + secret.slice(-4);
}

// Get a setting value - first from database, then from environment
export async function getSetting(key: SettingKey): Promise<string | null> {
  try {
    // First check database
    const dbSetting = await db.systemSetting.findUnique({
      where: { key },
    });
    if (dbSetting?.value) {
      return dbSetting.value;
    }
  } catch {
    // Database might not be available, fall back to env
  }

  // Fall back to environment variable
  return process.env[key] || null;
}

// Get all settings (masked for display)
export async function getAllSettings(): Promise<
  { key: string; value: string; isSecret: boolean; hasValue: boolean }[]
> {
  const allKeys = Object.values(SETTING_KEYS);

  // Get all database settings
  let dbSettings: Map<string, string> = new Map();
  try {
    const settings = await db.systemSetting.findMany();
    settings.forEach((s) => dbSettings.set(s.key, s.value));
  } catch {
    // Database might not be available
  }

  return allKeys.map((key) => {
    // Check database first, then environment
    const dbValue = dbSettings.get(key);
    const envValue = process.env[key];
    const value = dbValue || envValue;

    if (value) {
      return {
        key,
        value: maskSecret(value),
        isSecret: true,
        hasValue: true,
      };
    }

    return {
      key,
      value: "",
      isSecret: true,
      hasValue: false,
    };
  });
}

// Save a setting to database
export async function saveSetting(key: SettingKey, value: string): Promise<void> {
  await db.systemSetting.upsert({
    where: { key },
    update: { value, isSecret: true },
    create: { key, value, isSecret: true },
  });
}

// Delete a setting from database
export async function deleteSetting(key: SettingKey): Promise<void> {
  await db.systemSetting.delete({
    where: { key },
  }).catch(() => {
    // Ignore if not exists
  });
}

// Check if user is admin by their ID (checks role in database)
export async function isAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === "ADMIN";
  } catch {
    return false;
  }
}

// @deprecated Use isAdmin(userId) instead
export function isAdminEmail(email: string | null | undefined): boolean {
  console.warn("isAdminEmail is deprecated, use isAdmin(userId) instead");
  if (!email) return false;
  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// ==================== AI Task Configuration ====================

export interface FallbackModel {
  provider: string;
  modelId: string;
}

export interface AITaskConfigData {
  taskType: AITaskType;
  provider: string;
  modelId: string;
  fallbackModels: FallbackModel[];
  customApiUrl?: string | null;
  customApiKeyRef?: string | null;
  temperature: number;
  maxTokens: number;
  isEnabled: boolean;
}

// Default fallback chains per task type - ensure continuity of service
const DEFAULT_FALLBACK_CHAINS: Record<AITaskType, FallbackModel[]> = {
  RESUME_PARSING: [
    { provider: "openai", modelId: "gpt-4o" },
    { provider: "google", modelId: "gemini-1.5-pro" },
  ],
  RESUME_GENERATION: [
    { provider: "openai", modelId: "gpt-4o" },
    { provider: "google", modelId: "gemini-1.5-pro" },
  ],
  TEXT_IMPROVEMENT: [
    { provider: "openai", modelId: "gpt-4o-mini" },
    { provider: "google", modelId: "gemini-1.5-flash" },
  ],
  RESUME_REVIEW: [
    { provider: "openai", modelId: "gpt-4o" },
    { provider: "google", modelId: "gemini-1.5-pro" },
  ],
  STYLE_FORMATTING: [
    { provider: "openai", modelId: "gpt-4o" },
    { provider: "google", modelId: "gemini-1.5-pro" },
  ],
  IMAGE_GENERATION: [],
  TRANSLATION: [
    { provider: "openai", modelId: "gpt-4o-mini" },
    { provider: "google", modelId: "gemini-1.5-flash" },
  ],
};

// Get configuration for a specific AI task
export async function getAITaskConfig(taskType: AITaskType): Promise<AITaskConfigData> {
  try {
    const config = await db.aITaskConfig.findUnique({
      where: { taskType },
    });

    if (config) {
      // Parse fallbackModels - handle both array and string (from DB migration)
      let fallbackModels: FallbackModel[] = [];
      if (config.fallbackModels) {
        if (Array.isArray(config.fallbackModels)) {
          fallbackModels = config.fallbackModels as unknown as FallbackModel[];
        } else if (typeof config.fallbackModels === "string") {
          try {
            fallbackModels = JSON.parse(config.fallbackModels);
          } catch {
            fallbackModels = [];
          }
        }
      }

      return {
        taskType: config.taskType,
        provider: config.provider,
        modelId: config.modelId,
        fallbackModels,
        customApiUrl: config.customApiUrl,
        customApiKeyRef: config.customApiKeyRef,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        isEnabled: config.isEnabled,
      };
    }
  } catch {
    // Database might not be available or table doesn't exist yet
  }

  // Return default config with default fallback chain
  const defaultConfig = DEFAULT_TASK_CONFIGS[taskType];
  return {
    taskType,
    provider: defaultConfig.provider,
    modelId: defaultConfig.modelId,
    fallbackModels: DEFAULT_FALLBACK_CHAINS[taskType] || [],
    customApiUrl: null,
    customApiKeyRef: null,
    temperature: defaultConfig.temperature,
    maxTokens: defaultConfig.maxTokens,
    isEnabled: true,
  };
}

// Get all AI task configurations
export async function getAllAITaskConfigs(): Promise<AITaskConfigData[]> {
  const taskTypes = Object.keys(AI_TASK_TYPES) as AITaskType[];
  const configs: AITaskConfigData[] = [];

  for (const taskType of taskTypes) {
    const config = await getAITaskConfig(taskType);
    configs.push(config);
  }

  return configs;
}

// Save AI task configuration
export async function saveAITaskConfig(config: Partial<AITaskConfigData> & { taskType: AITaskType }): Promise<void> {
  const existing = await getAITaskConfig(config.taskType);

  // Convert fallbackModels to JSON-compatible format for Prisma
  const fallbackModelsJson = (config.fallbackModels ?? existing.fallbackModels) as unknown as Prisma.InputJsonValue;

  await db.aITaskConfig.upsert({
    where: { taskType: config.taskType },
    update: {
      provider: config.provider ?? existing.provider,
      modelId: config.modelId ?? existing.modelId,
      fallbackModels: fallbackModelsJson,
      customApiUrl: config.customApiUrl,
      customApiKeyRef: config.customApiKeyRef,
      temperature: config.temperature ?? existing.temperature,
      maxTokens: config.maxTokens ?? existing.maxTokens,
      isEnabled: config.isEnabled ?? existing.isEnabled,
    },
    create: {
      taskType: config.taskType,
      provider: config.provider ?? existing.provider,
      modelId: config.modelId ?? existing.modelId,
      fallbackModels: fallbackModelsJson,
      customApiUrl: config.customApiUrl,
      customApiKeyRef: config.customApiKeyRef,
      temperature: config.temperature ?? existing.temperature,
      maxTokens: config.maxTokens ?? existing.maxTokens,
      isEnabled: config.isEnabled ?? true,
    },
  });
}

// Get API key for a provider
export async function getProviderApiKey(provider: string, customKeyRef?: string | null): Promise<string | null> {
  // For custom providers, use the custom key reference
  if (provider === "custom" && customKeyRef) {
    return getSetting(customKeyRef as SettingKey);
  }

  // Map provider to API key setting
  const keyMap: Record<string, SettingKey> = {
    openai: SETTING_KEYS.OPENAI_API_KEY,
    anthropic: SETTING_KEYS.ANTHROPIC_API_KEY,
    google: SETTING_KEYS.GOOGLE_AI_API_KEY,
  };

  const settingKey = keyMap[provider];
  if (!settingKey) return null;

  return getSetting(settingKey);
}

// ==================== Multi-Model Review Configuration ====================

export interface MultiModelConfig {
  provider: string;
  modelId: string;
  name?: string;
}

export interface MultiModelReviewConfigData {
  id?: string;
  models: MultiModelConfig[];
  synthesisProvider: string;
  synthesisModelId: string;
  isEnabled: boolean;
  minModelsRequired: number;
}

// Setting key for multi-model config (temporary storage until Prisma migration)
const MULTI_MODEL_CONFIG_KEY = "MULTI_MODEL_REVIEW_CONFIG";

// Get multi-model review configuration
export async function getMultiModelReviewConfig(): Promise<MultiModelReviewConfigData> {
  // Default config
  const defaultConfig: MultiModelReviewConfigData = {
    models: [
      { provider: "anthropic", modelId: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { provider: "openai", modelId: "gpt-4o", name: "GPT-4o" },
    ],
    synthesisProvider: "anthropic",
    synthesisModelId: "claude-sonnet-4-20250514",
    isEnabled: true,
    minModelsRequired: 2,
  };

  try {
    // First try SystemSetting (temporary storage)
    const settingValue = await db.systemSetting.findUnique({
      where: { key: MULTI_MODEL_CONFIG_KEY },
    });

    if (settingValue?.value) {
      const parsed = JSON.parse(settingValue.value);
      return {
        ...defaultConfig,
        ...parsed,
        models: parsed.models || defaultConfig.models,
      };
    }

    // Then try dedicated table if it exists
    const dbAny = db as any;
    if (dbAny.multiModelReviewConfig) {
      const config = await dbAny.multiModelReviewConfig.findFirst();
      if (config) {
        return {
          id: config.id,
          models: config.models as MultiModelConfig[],
          synthesisProvider: config.synthesisProvider,
          synthesisModelId: config.synthesisModelId,
          isEnabled: config.isEnabled,
          minModelsRequired: config.minModelsRequired,
        };
      }
    }
  } catch (error) {
    console.warn("Failed to get multi-model config:", error);
  }

  return defaultConfig;
}

// Save multi-model review configuration
export async function saveMultiModelReviewConfig(config: Partial<MultiModelReviewConfigData>): Promise<void> {
  try {
    // Get existing config to merge with
    const existing = await getMultiModelReviewConfig();

    const newConfig = {
      models: config.models ?? existing.models,
      synthesisProvider: config.synthesisProvider ?? existing.synthesisProvider,
      synthesisModelId: config.synthesisModelId ?? existing.synthesisModelId,
      isEnabled: config.isEnabled ?? existing.isEnabled,
      minModelsRequired: config.minModelsRequired ?? existing.minModelsRequired,
    };

    // Save to SystemSetting (works without migration)
    await db.systemSetting.upsert({
      where: { key: MULTI_MODEL_CONFIG_KEY },
      update: { value: JSON.stringify(newConfig), isSecret: false },
      create: { key: MULTI_MODEL_CONFIG_KEY, value: JSON.stringify(newConfig), isSecret: false },
    });

    console.log("[MultiModel] Config saved:", newConfig.models.length, "models");
  } catch (error) {
    console.error("Failed to save multi-model config:", error);
    throw error;
  }
}
