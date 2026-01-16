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
  type FallbackModel,
} from "@/lib/settings";
import {
  isModelAllowedForPlan,
  getTaskModelOverride,
  getSubscriptionPlan,
} from "@/lib/subscription-plans";

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
  fallbackModels: FallbackModel[];
}

// Extended params types that include commonly used AI parameters
type GenerateTextParams = Omit<Parameters<typeof aiGenerateText>[0], "model"> & {
  maxTokens?: number;
  temperature?: number;
};

type GenerateObjectParams = Omit<Parameters<typeof aiGenerateObject>[0], "model"> & {
  maxTokens?: number;
  temperature?: number;
};

// ==================== Fallback Execution System ====================

/**
 * Check if an error should trigger a fallback to another model
 */
function shouldFallback(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Rate limiting - definitely fallback
    if (message.includes("rate limit") || message.includes("429") || message.includes("too many requests")) {
      return true;
    }

    // Server errors - fallback
    if (message.includes("500") || message.includes("502") || message.includes("503") || message.includes("504")) {
      return true;
    }

    // Model overloaded
    if (message.includes("overloaded") || message.includes("capacity")) {
      return true;
    }

    // API key issues - might want to try different provider
    if (message.includes("invalid api key") || message.includes("authentication") || message.includes("unauthorized")) {
      return true;
    }

    // Network errors
    if (
      message.includes("timeout") ||
      message.includes("econnrefused") ||
      message.includes("econnreset") ||
      message.includes("network")
    ) {
      return true;
    }

    // Model not found or unavailable
    if (message.includes("not found") || message.includes("does not exist") || message.includes("unavailable")) {
      return true;
    }
  }

  return false;
}

export interface FallbackExecutionResult<T> {
  result: T;
  modelUsed: { provider: string; modelId: string };
  fallbacksAttempted: number;
}

/**
 * Execute an AI operation with automatic fallback to alternative models
 *
 * @param taskConfig - The task configuration with primary model and fallbacks
 * @param operation - A function that takes a model and returns a promise
 * @returns The result along with info about which model was used
 */
export async function executeWithFallback<T>(
  taskConfig: TaskModelConfig,
  operation: (model: ReturnType<ReturnType<typeof createOpenAI>>, config: { temperature: number; maxTokens: number }) => Promise<T>
): Promise<FallbackExecutionResult<T>> {
  const allModels = [
    { provider: taskConfig.provider, modelId: taskConfig.modelId },
    ...taskConfig.fallbackModels,
  ];

  let lastError: Error | null = null;
  let fallbacksAttempted = 0;

  for (let i = 0; i < allModels.length; i++) {
    const modelConfig = allModels[i];
    const isPrimary = i === 0;

    try {
      const model = await getModelForProvider(modelConfig.provider, modelConfig.modelId);

      if (!isPrimary) {
        console.log(`[AI Fallback] Trying fallback model ${i}/${allModels.length - 1}: ${modelConfig.provider}/${modelConfig.modelId}`);
        fallbacksAttempted++;
      }

      const result = await operation(model, {
        temperature: taskConfig.temperature,
        maxTokens: taskConfig.maxTokens,
      });

      if (!isPrimary) {
        console.log(`[AI Fallback] Success with fallback model: ${modelConfig.provider}/${modelConfig.modelId}`);
      }

      return {
        result,
        modelUsed: modelConfig,
        fallbacksAttempted,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      console.warn(
        `[AI Fallback] Model ${modelConfig.provider}/${modelConfig.modelId} failed:`,
        lastError.message
      );

      // Check if we should try the next model
      if (!shouldFallback(error) || i === allModels.length - 1) {
        // Either error is not recoverable or we're out of fallbacks
        throw error;
      }

      // Continue to next model
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error("All models failed");
}

/**
 * Execute an AI text generation with automatic fallback
 */
export async function generateTextWithFallback(
  taskConfig: TaskModelConfig,
  params: GenerateTextParams
): Promise<FallbackExecutionResult<Awaited<ReturnType<typeof aiGenerateText>>>> {
  return executeWithFallback(taskConfig, async (model, config) => {
    return aiGenerateText({
      ...params,
      model,
      temperature: params.temperature ?? config.temperature,
      maxTokens: params.maxTokens ?? config.maxTokens,
    } as Parameters<typeof aiGenerateText>[0]);
  });
}

/**
 * Execute an AI object generation with automatic fallback
 */
export async function generateObjectWithFallback<T>(
  taskConfig: TaskModelConfig,
  params: GenerateObjectParams
): Promise<FallbackExecutionResult<Awaited<ReturnType<typeof aiGenerateObject>>>> {
  return executeWithFallback(taskConfig, async (model, config) => {
    return aiGenerateObject({
      ...params,
      model,
      temperature: params.temperature ?? config.temperature,
      maxTokens: params.maxTokens ?? config.maxTokens,
    } as Parameters<typeof aiGenerateObject>[0]);
  });
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
    fallbackModels: config.fallbackModels,
  };
}

// Get model for task with plan-based restrictions
export async function getModelForTaskWithPlanCheck(
  taskType: AITaskType,
  userPlanKey: string
): Promise<TaskModelConfig> {
  // First check if there's a plan-specific override for this task
  const planOverride = await getTaskModelOverride(userPlanKey, taskType);
  const baseConfig = await getAITaskConfig(taskType);

  if (planOverride) {
    // Use plan-specific model override
    const model = await getModelForProvider(planOverride.provider, planOverride.modelId);

    return {
      model,
      temperature: baseConfig.temperature,
      maxTokens: baseConfig.maxTokens,
      provider: planOverride.provider,
      modelId: planOverride.modelId,
      fallbackModels: baseConfig.fallbackModels,
    };
  }

  // Get the default task config
  const config = baseConfig;

  if (!config.isEnabled) {
    throw new Error(`AI task ${taskType} is disabled`);
  }

  // Check if the model is allowed for this plan
  const isAllowed = await isModelAllowedForPlan(userPlanKey, config.modelId);

  if (!isAllowed) {
    // Try to find an allowed alternative model
    const plan = await getSubscriptionPlan(userPlanKey);
    if (!plan || plan.allowedModels.length === 0) {
      throw new Error(
        `Your subscription plan does not include access to AI models. Please upgrade your plan.`
      );
    }

    // Use the first allowed model as fallback
    const fallbackModelId = plan.allowedModels[0];
    // Determine provider from model ID
    const fallbackProvider = fallbackModelId.includes("gpt")
      ? AI_PROVIDERS.OPENAI
      : fallbackModelId.includes("claude")
        ? AI_PROVIDERS.ANTHROPIC
        : fallbackModelId.includes("gemini")
          ? AI_PROVIDERS.GOOGLE
          : AI_PROVIDERS.ANTHROPIC;

    console.warn(
      `[AI Client] Model ${config.modelId} not allowed for plan ${userPlanKey}, using fallback: ${fallbackModelId}`
    );

    const model = await getModelForProvider(fallbackProvider, fallbackModelId);

    return {
      model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      provider: fallbackProvider,
      modelId: fallbackModelId,
      fallbackModels: config.fallbackModels,
    };
  }

  // Model is allowed, use it
  const model = await getModelForProvider(config.provider, config.modelId);

  return {
    model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    provider: config.provider,
    modelId: config.modelId,
    fallbackModels: config.fallbackModels,
  };
}

// Check if a specific model is allowed for a user's plan
export async function checkModelAccess(
  modelId: string,
  userPlanKey: string
): Promise<{ allowed: boolean; reason?: string }> {
  const isAllowed = await isModelAllowedForPlan(userPlanKey, modelId);

  if (!isAllowed) {
    const plan = await getSubscriptionPlan(userPlanKey);
    if (!plan) {
      return { allowed: false, reason: "Subscription plan not found" };
    }
    if (plan.allowedModels.length === 0) {
      return { allowed: false, reason: "Your plan does not include AI model access" };
    }
    return {
      allowed: false,
      reason: `Model ${modelId} is not available on your ${plan.name} plan`,
    };
  }

  return { allowed: true };
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

// ==================== Task-based Fallback Execution ====================

/**
 * Execute AI text generation for a specific task type with automatic fallback
 * This is the recommended way to call AI with built-in resilience
 */
export async function generateTextForTask(
  taskType: AITaskType,
  params: GenerateTextParams,
  options?: { userPlanKey?: string }
): Promise<{ text: string; modelUsed: { provider: string; modelId: string }; fallbacksAttempted: number }> {
  const taskConfig = options?.userPlanKey
    ? await getModelForTaskWithPlanCheck(taskType, options.userPlanKey)
    : await getModelForTask(taskType);

  const result = await generateTextWithFallback(taskConfig, params);

  return {
    text: result.result.text,
    modelUsed: result.modelUsed,
    fallbacksAttempted: result.fallbacksAttempted,
  };
}

/**
 * Execute AI object generation for a specific task type with automatic fallback
 * This is the recommended way to call AI with built-in resilience
 */
export async function generateObjectForTask<T>(
  taskType: AITaskType,
  params: GenerateObjectParams,
  options?: { userPlanKey?: string }
): Promise<{ object: T; modelUsed: { provider: string; modelId: string }; fallbacksAttempted: number }> {
  const taskConfig = options?.userPlanKey
    ? await getModelForTaskWithPlanCheck(taskType, options.userPlanKey)
    : await getModelForTask(taskType);

  const result = await generateObjectWithFallback<T>(taskConfig, params);

  return {
    object: (result.result as any).object as T,
    modelUsed: result.modelUsed,
    fallbacksAttempted: result.fallbacksAttempted,
  };
}
