import { db } from "./db";
import type { SubscriptionPlanConfig } from "@prisma/client";
import { PLANS } from "./constants";
import { AI_MODELS } from "./settings";

// Types
export interface PlanConfig {
  key: string;
  name: string;
  nameUk: string | null;
  description: string | null;
  descriptionUk: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
  maxResumes: number;
  aiGenerationsPerMonth: number;
  aiReviewsPerMonth: number;
  multiModelReview: boolean;
  pdfWatermark: boolean;
  prioritySupport: boolean;
  allowedModels: string[];
  taskModelOverrides: Record<string, { provider: string; modelId: string }>;
  isActive: boolean;
  sortOrder: number;
}

// Cache for plans (5 minute TTL)
let planCache: Map<string, PlanConfig> = new Map();
let planCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Get all available AI models as flat list with provider info
export function getAllAvailableModels(): Array<{ id: string; name: string; provider: string; tier: string }> {
  const models: Array<{ id: string; name: string; provider: string; tier: string }> = [];

  for (const [provider, providerModels] of Object.entries(AI_MODELS)) {
    for (const model of providerModels) {
      models.push({
        id: model.id,
        name: model.name,
        provider,
        tier: model.tier,
      });
    }
  }

  return models;
}

// Convert DB record to PlanConfig
function dbToPlanConfig(record: SubscriptionPlanConfig): PlanConfig {
  return {
    key: record.key,
    name: record.name,
    nameUk: record.nameUk,
    description: record.description,
    descriptionUk: record.descriptionUk,
    priceMonthly: record.priceMonthly,
    priceYearly: record.priceYearly,
    currency: record.currency,
    stripePriceIdMonthly: record.stripePriceIdMonthly,
    stripePriceIdYearly: record.stripePriceIdYearly,
    maxResumes: record.maxResumes,
    aiGenerationsPerMonth: record.aiGenerationsPerMonth,
    aiReviewsPerMonth: record.aiReviewsPerMonth,
    multiModelReview: record.multiModelReview,
    pdfWatermark: record.pdfWatermark,
    prioritySupport: record.prioritySupport,
    allowedModels: record.allowedModels as string[],
    taskModelOverrides: record.taskModelOverrides as Record<string, { provider: string; modelId: string }>,
    isActive: record.isActive,
    sortOrder: record.sortOrder,
  };
}

// Get fallback plan from constants (for backwards compatibility)
function getFallbackPlan(key: string): PlanConfig | null {
  const planData = PLANS[key as keyof typeof PLANS];
  if (!planData) return null;

  // Get all models for fallback (all allowed)
  const allModels = getAllAvailableModels().map(m => m.id);

  return {
    key,
    name: planData.name,
    nameUk: null,
    description: null,
    descriptionUk: null,
    priceMonthly: planData.price,
    priceYearly: planData.price * 10, // 10 months for yearly
    currency: "USD",
    stripePriceIdMonthly: (planData as any).stripePriceId || null,
    stripePriceIdYearly: null,
    maxResumes: planData.features.resumes,
    aiGenerationsPerMonth: planData.features.aiGenerations,
    aiReviewsPerMonth: planData.features.aiReviews,
    multiModelReview: planData.features.multiModelReview,
    pdfWatermark: planData.features.watermark,
    prioritySupport: false,
    allowedModels: allModels, // All models allowed for fallback
    taskModelOverrides: {},
    isActive: true,
    sortOrder: key === "FREE" ? 0 : key === "PRO" ? 1 : 2,
  };
}

// Clear cache
export function clearPlanCache(): void {
  planCache.clear();
  planCacheTime = 0;
}

// Check if cache is valid
function isCacheValid(): boolean {
  return planCacheTime > 0 && Date.now() - planCacheTime < CACHE_TTL;
}

// Get a single plan by key
export async function getSubscriptionPlan(key: string): Promise<PlanConfig | null> {
  // Check cache first
  if (isCacheValid() && planCache.has(key)) {
    return planCache.get(key) || null;
  }

  try {
    const record = await db.subscriptionPlanConfig.findUnique({
      where: { key },
    });

    if (record) {
      const plan = dbToPlanConfig(record);
      planCache.set(key, plan);
      return plan;
    }
  } catch (error) {
    console.error("Failed to fetch plan from DB:", error);
  }

  // Fallback to constants
  return getFallbackPlan(key);
}

// Get all active plans
export async function getAllPlans(): Promise<PlanConfig[]> {
  // Check cache
  if (isCacheValid() && planCache.size > 0) {
    return Array.from(planCache.values()).filter(p => p.isActive);
  }

  try {
    const records = await db.subscriptionPlanConfig.findMany({
      orderBy: { sortOrder: "asc" },
    });

    if (records.length > 0) {
      planCache.clear();
      planCacheTime = Date.now();

      const plans = records.map(dbToPlanConfig);
      plans.forEach(plan => planCache.set(plan.key, plan));

      return plans.filter(p => p.isActive);
    }
  } catch (error) {
    console.error("Failed to fetch plans from DB:", error);
  }

  // Fallback to constants
  return Object.keys(PLANS).map(key => getFallbackPlan(key)!).filter(Boolean);
}

// Check if a model is allowed for a plan
export async function isModelAllowedForPlan(planKey: string, modelId: string): Promise<boolean> {
  const plan = await getSubscriptionPlan(planKey);
  if (!plan) return false;

  // Empty array means no models allowed (explicit selection required)
  if (plan.allowedModels.length === 0) return false;

  return plan.allowedModels.includes(modelId);
}

// Get model override for a specific task (if configured)
export async function getTaskModelOverride(
  planKey: string,
  taskType: string
): Promise<{ provider: string; modelId: string } | null> {
  const plan = await getSubscriptionPlan(planKey);
  if (!plan) return null;

  return plan.taskModelOverrides[taskType] || null;
}

// Seed default plans
export async function seedDefaultPlans(): Promise<void> {
  const allModels = getAllAvailableModels();

  // Define which models each tier gets
  const fastModels = allModels.filter(m => m.tier === "fast").map(m => m.id);
  const qualityModels = allModels.filter(m => m.tier === "quality" || m.tier === "fast").map(m => m.id);
  const allModelIds = allModels.map(m => m.id);

  const defaultPlans = [
    {
      key: "FREE",
      name: "Free",
      nameUk: "Безкоштовний",
      description: "Get started with basic resume building",
      descriptionUk: "Почніть з базового створення резюме",
      priceMonthly: 0,
      priceYearly: 0,
      currency: "USD",
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      maxResumes: 1,
      aiGenerationsPerMonth: 3,
      aiReviewsPerMonth: 0,
      multiModelReview: false,
      pdfWatermark: true,
      prioritySupport: false,
      allowedModels: fastModels, // Only fast models for free tier
      taskModelOverrides: {},
      isActive: true,
      sortOrder: 0,
    },
    {
      key: "PRO",
      name: "Pro",
      nameUk: "Про",
      description: "Best for active job seekers",
      descriptionUk: "Найкраще для активних шукачів роботи",
      priceMonthly: 9.99,
      priceYearly: 99.99,
      currency: "USD",
      stripePriceIdMonthly: process.env.STRIPE_PRO_PRICE_ID || null,
      stripePriceIdYearly: null,
      maxResumes: 5,
      aiGenerationsPerMonth: 50,
      aiReviewsPerMonth: 3,
      multiModelReview: false,
      pdfWatermark: false,
      prioritySupport: false,
      allowedModels: qualityModels, // Fast + quality models
      taskModelOverrides: {},
      isActive: true,
      sortOrder: 1,
    },
    {
      key: "PREMIUM",
      name: "Premium",
      nameUk: "Преміум",
      description: "Unlimited access with all features",
      descriptionUk: "Необмежений доступ з усіма функціями",
      priceMonthly: 29.99,
      priceYearly: 299.99,
      currency: "USD",
      stripePriceIdMonthly: process.env.STRIPE_PREMIUM_PRICE_ID || null,
      stripePriceIdYearly: null,
      maxResumes: -1,
      aiGenerationsPerMonth: -1,
      aiReviewsPerMonth: -1,
      multiModelReview: true,
      pdfWatermark: false,
      prioritySupport: true,
      allowedModels: allModelIds, // All models
      taskModelOverrides: {},
      isActive: true,
      sortOrder: 2,
    },
  ] as const;

  for (const plan of defaultPlans) {
    await db.subscriptionPlanConfig.upsert({
      where: { key: plan.key },
      update: {}, // Don't update if exists
      create: {
        key: plan.key,
        name: plan.name,
        nameUk: plan.nameUk,
        description: plan.description,
        descriptionUk: plan.descriptionUk,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        currency: plan.currency,
        stripePriceIdMonthly: plan.stripePriceIdMonthly,
        stripePriceIdYearly: plan.stripePriceIdYearly,
        maxResumes: plan.maxResumes,
        aiGenerationsPerMonth: plan.aiGenerationsPerMonth,
        aiReviewsPerMonth: plan.aiReviewsPerMonth,
        multiModelReview: plan.multiModelReview,
        pdfWatermark: plan.pdfWatermark,
        prioritySupport: plan.prioritySupport,
        allowedModels: plan.allowedModels as string[],
        taskModelOverrides: plan.taskModelOverrides,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      },
    });
  }

  // Clear cache after seeding
  clearPlanCache();
}

// Create a new plan
export async function createPlan(data: Omit<PlanConfig, "isActive" | "sortOrder"> & { isActive?: boolean; sortOrder?: number }): Promise<PlanConfig> {
  const record = await db.subscriptionPlanConfig.create({
    data: {
      key: data.key,
      name: data.name,
      nameUk: data.nameUk,
      description: data.description,
      descriptionUk: data.descriptionUk,
      priceMonthly: data.priceMonthly,
      priceYearly: data.priceYearly,
      currency: data.currency,
      stripePriceIdMonthly: data.stripePriceIdMonthly,
      stripePriceIdYearly: data.stripePriceIdYearly,
      maxResumes: data.maxResumes,
      aiGenerationsPerMonth: data.aiGenerationsPerMonth,
      aiReviewsPerMonth: data.aiReviewsPerMonth,
      multiModelReview: data.multiModelReview,
      pdfWatermark: data.pdfWatermark,
      prioritySupport: data.prioritySupport,
      allowedModels: data.allowedModels,
      taskModelOverrides: data.taskModelOverrides,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 99,
    },
  });

  clearPlanCache();
  return dbToPlanConfig(record);
}

// Update an existing plan
export async function updatePlan(key: string, data: Partial<PlanConfig>): Promise<PlanConfig | null> {
  try {
    const record = await db.subscriptionPlanConfig.update({
      where: { key },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.nameUk !== undefined && { nameUk: data.nameUk }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.descriptionUk !== undefined && { descriptionUk: data.descriptionUk }),
        ...(data.priceMonthly !== undefined && { priceMonthly: data.priceMonthly }),
        ...(data.priceYearly !== undefined && { priceYearly: data.priceYearly }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.stripePriceIdMonthly !== undefined && { stripePriceIdMonthly: data.stripePriceIdMonthly }),
        ...(data.stripePriceIdYearly !== undefined && { stripePriceIdYearly: data.stripePriceIdYearly }),
        ...(data.maxResumes !== undefined && { maxResumes: data.maxResumes }),
        ...(data.aiGenerationsPerMonth !== undefined && { aiGenerationsPerMonth: data.aiGenerationsPerMonth }),
        ...(data.aiReviewsPerMonth !== undefined && { aiReviewsPerMonth: data.aiReviewsPerMonth }),
        ...(data.multiModelReview !== undefined && { multiModelReview: data.multiModelReview }),
        ...(data.pdfWatermark !== undefined && { pdfWatermark: data.pdfWatermark }),
        ...(data.prioritySupport !== undefined && { prioritySupport: data.prioritySupport }),
        ...(data.allowedModels !== undefined && { allowedModels: data.allowedModels }),
        ...(data.taskModelOverrides !== undefined && { taskModelOverrides: data.taskModelOverrides }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    clearPlanCache();
    return dbToPlanConfig(record);
  } catch (error) {
    console.error("Failed to update plan:", error);
    return null;
  }
}

// Delete a plan (only if no users are subscribed)
export async function deletePlan(key: string): Promise<{ success: boolean; error?: string }> {
  // Check if any users are subscribed to this plan
  const subscribedUsers = await db.subscription.count({
    where: { plan: key },
  });

  if (subscribedUsers > 0) {
    return {
      success: false,
      error: `Cannot delete plan: ${subscribedUsers} user(s) are currently subscribed`,
    };
  }

  try {
    await db.subscriptionPlanConfig.delete({
      where: { key },
    });
    clearPlanCache();
    return { success: true };
  } catch (error) {
    console.error("Failed to delete plan:", error);
    return { success: false, error: "Failed to delete plan" };
  }
}

// Get plan limits for backwards compatibility
export async function getPlanLimits(planKey: string, isAdmin: boolean = false) {
  // Admins always get unlimited
  if (isAdmin) {
    return {
      maxResumes: -1,
      aiGenerations: -1,
      aiReviews: -1,
      multiModelReview: true,
      pdfWatermark: false,
    };
  }

  const plan = await getSubscriptionPlan(planKey);
  if (!plan) {
    // Return most restrictive defaults if plan not found
    return {
      maxResumes: 1,
      aiGenerations: 0,
      aiReviews: 0,
      multiModelReview: false,
      pdfWatermark: true,
    };
  }

  return {
    maxResumes: plan.maxResumes,
    aiGenerations: plan.aiGenerationsPerMonth,
    aiReviews: plan.aiReviewsPerMonth,
    multiModelReview: plan.multiModelReview,
    pdfWatermark: plan.pdfWatermark,
  };
}
