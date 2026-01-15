import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText as aiGenerateText, streamText as aiStreamText, generateObject as aiGenerateObject } from "ai";
import type { AITaskType } from "@prisma/client";
import {
  getAITaskConfig,
  getSetting,
  SETTING_KEYS,
  AI_PROVIDERS,
  type AIProvider,
} from "@/lib/settings";

// ============================================
// AI Retry Configuration
// ============================================

interface AIRetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  operationName?: string;
}

const DEFAULT_AI_RETRY_OPTIONS: Required<AIRetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  operationName: "AI operation",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableAIError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Rate limiting
    if (message.includes("rate limit") || message.includes("429") || message.includes("too many requests")) {
      return true;
    }

    // Server errors
    if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
      return true;
    }

    // Network errors
    if (
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("socket hang up") ||
      message.includes("network") ||
      name.includes("fetch")
    ) {
      return true;
    }

    // Provider-specific overload errors
    if (message.includes("overloaded") || message.includes("capacity")) {
      return true;
    }
  }

  return false;
}

/**
 * Execute an AI operation with exponential backoff retry
 */
export async function withAIRetry<T>(
  operation: () => Promise<T>,
  options: AIRetryOptions = {}
): Promise<T> {
  const {
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    operationName,
  } = { ...DEFAULT_AI_RETRY_OPTIONS, ...options };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableAIError(error) || attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = initialDelayMs * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;
      const delay = Math.min(baseDelay + jitter, maxDelayMs);

      console.warn(
        `[AI Retry] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(delay)}ms:`,
        lastError.message
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Wrapper for generateText with automatic retry
 */
export async function generateTextWithRetry(
  params: Parameters<typeof aiGenerateText>[0],
  retryOptions?: AIRetryOptions
): ReturnType<typeof aiGenerateText> {
  return withAIRetry(
    () => aiGenerateText(params),
    { operationName: "generateText", ...retryOptions }
  );
}

/**
 * Wrapper for streamText
 * Note: streamText returns synchronously, retry logic doesn't apply to streams
 */
export function streamTextWithRetry(
  params: Parameters<typeof aiStreamText>[0],
  _retryOptions?: AIRetryOptions
): ReturnType<typeof aiStreamText> {
  return aiStreamText(params);
}

/**
 * Wrapper for generateObject with automatic retry
 */
export async function generateObjectWithRetry(
  params: Parameters<typeof aiGenerateObject>[0],
  retryOptions?: AIRetryOptions
): Promise<Awaited<ReturnType<typeof aiGenerateObject>>> {
  return withAIRetry(
    () => aiGenerateObject(params),
    { operationName: "generateObject", ...retryOptions }
  );
}

// Provider instances cache
let openaiInstance: ReturnType<typeof createOpenAI> | null = null;
let anthropicInstance: ReturnType<typeof createAnthropic> | null = null;
let googleInstance: ReturnType<typeof createGoogleGenerativeAI> | null = null;

// Get or create OpenAI instance
async function getOpenAI() {
  if (!openaiInstance) {
    const apiKey = await getSetting(SETTING_KEYS.OPENAI_API_KEY);
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set. Please configure it in Admin Settings.");
    }
    openaiInstance = createOpenAI({ apiKey });
  }
  return openaiInstance;
}

// Get or create Anthropic instance
async function getAnthropic() {
  if (!anthropicInstance) {
    const apiKey = await getSetting(SETTING_KEYS.ANTHROPIC_API_KEY);
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set. Please configure it in Admin Settings.");
    }
    anthropicInstance = createAnthropic({ apiKey });
  }
  return anthropicInstance;
}

// Get or create Google AI instance
async function getGoogle() {
  if (!googleInstance) {
    const apiKey = await getSetting(SETTING_KEYS.GOOGLE_AI_API_KEY);
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not set. Please configure it in Admin Settings.");
    }
    googleInstance = createGoogleGenerativeAI({ apiKey });
  }
  return googleInstance;
}

// Get model instance for a specific provider and model ID
async function getModelForProvider(provider: string, modelId: string) {
  switch (provider) {
    case AI_PROVIDERS.OPENAI:
      return (await getOpenAI())(modelId);
    case AI_PROVIDERS.ANTHROPIC:
      return (await getAnthropic())(modelId);
    case AI_PROVIDERS.GOOGLE:
      return (await getGoogle())(modelId);
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}

// Get the configured AI provider (defaults to anthropic) - legacy support
async function getAIProvider(): Promise<AIProvider> {
  const provider = await getSetting(SETTING_KEYS.AI_PROVIDER);
  if (provider === AI_PROVIDERS.OPENAI || provider === AI_PROVIDERS.ANTHROPIC) {
    return provider;
  }
  return AI_PROVIDERS.ANTHROPIC;
}

// ==================== Task-specific model access ====================

export interface TaskModelConfig {
  model: ReturnType<ReturnType<typeof createOpenAI>>;
  temperature: number;
  maxTokens: number;
  provider: string;
  modelId: string;
}

// Get model configured for a specific task type
export async function getModelForTask(taskType: AITaskType): Promise<TaskModelConfig> {
  const config = await getAITaskConfig(taskType);

  if (!config.isEnabled) {
    throw new Error(`AI task ${taskType} is disabled`);
  }

  const model = await getModelForProvider(config.provider, config.modelId);

  return {
    model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    provider: config.provider,
    modelId: config.modelId,
  };
}

// ==================== Legacy model aliases (for backwards compatibility) ====================

export const models = {
  // Fast model for simple text generation
  fast: async () => {
    try {
      const config = await getModelForTask("TEXT_IMPROVEMENT");
      return config.model;
    } catch {
      // Fallback to default
      const provider = await getAIProvider();
      if (provider === AI_PROVIDERS.OPENAI) {
        return (await getOpenAI())("gpt-4o-mini");
      }
      return (await getAnthropic())("claude-3-5-haiku-20241022");
    }
  },

  // High quality model for complex generation
  quality: async () => {
    try {
      const config = await getModelForTask("RESUME_GENERATION");
      return config.model;
    } catch {
      const provider = await getAIProvider();
      if (provider === AI_PROVIDERS.OPENAI) {
        return (await getOpenAI())("gpt-4o");
      }
      return (await getAnthropic())("claude-sonnet-4-20250514");
    }
  },

  // Model for analysis and review
  analysis: async () => {
    try {
      const config = await getModelForTask("RESUME_PARSING");
      return config.model;
    } catch {
      const provider = await getAIProvider();
      if (provider === AI_PROVIDERS.OPENAI) {
        return (await getOpenAI())("gpt-4o");
      }
      return (await getAnthropic())("claude-sonnet-4-20250514");
    }
  },

  // Model for vision tasks
  vision: async () => {
    const provider = await getAIProvider();
    if (provider === AI_PROVIDERS.OPENAI) {
      return (await getOpenAI())("gpt-4o");
    }
    return (await getAnthropic())("claude-sonnet-4-20250514");
  },
};

// ==================== Direct task model access ====================

// Convenience functions for common tasks
export const taskModels = {
  parsing: () => getModelForTask("RESUME_PARSING"),
  generation: () => getModelForTask("RESUME_GENERATION"),
  textImprovement: () => getModelForTask("TEXT_IMPROVEMENT"),
  review: () => getModelForTask("RESUME_REVIEW"),
  styleFormatting: () => getModelForTask("STYLE_FORMATTING"),
  translation: () => getModelForTask("TRANSLATION"),
  imageGeneration: () => getModelForTask("IMAGE_GENERATION"),
};
