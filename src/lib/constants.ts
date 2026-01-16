export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    features: {
      resumes: 1,
      aiGenerations: 3,
      aiReviews: 0,
      multiModelReview: false,
      pdfExport: true,
      watermark: true,
      templates: "basic",
    },
  },
  PRO: {
    name: "Pro",
    price: 9,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    features: {
      resumes: 5,
      aiGenerations: 50,
      aiReviews: 3,
      multiModelReview: false,
      pdfExport: true,
      watermark: false,
      templates: "all",
    },
  },
  PREMIUM: {
    name: "Premium",
    price: 19,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID,
    features: {
      resumes: -1, // unlimited
      aiGenerations: -1,
      aiReviews: -1,
      multiModelReview: true, // Multi-AI review with synthesis
      pdfExport: true,
      watermark: false,
      templates: "all",
    },
  },
} as const;

export const REGIONS = {
  US: {
    name: "United States",
    nameUk: "США",
    showPhoto: false,
    paperSize: "letter",
  },
  EU: {
    name: "European Union",
    nameUk: "Європейський Союз",
    showPhoto: true,
    paperSize: "a4",
  },
  UA: {
    name: "Ukraine",
    nameUk: "Україна",
    showPhoto: true,
    paperSize: "a4",
  },
} as const;

export const LOCALES = ["en", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

// Plan types
export type PlanType = keyof typeof PLANS;

// Get effective plan for a user (admins always get PREMIUM)
export function getEffectivePlan(
  subscriptionPlan: string | null | undefined,
  isAdmin: boolean
): PlanType {
  if (isAdmin) {
    return "PREMIUM";
  }
  const plan = (subscriptionPlan || "FREE") as PlanType;
  return plan in PLANS ? plan : "FREE";
}

// Get plan features with admin check (sync version - uses hardcoded values)
export function getPlanFeatures(
  subscriptionPlan: string | null | undefined,
  isAdmin: boolean
) {
  const effectivePlan = getEffectivePlan(subscriptionPlan, isAdmin);
  return PLANS[effectivePlan].features;
}

// ==================== Async functions with DB fallback ====================
// Import these from subscription-plans.ts for DB-backed features:
// - getPlanLimits(planKey, isAdmin) - async, reads from DB
// - getSubscriptionPlan(key) - async, reads from DB with caching
// - isModelAllowedForPlan(planKey, modelId) - async, checks model access
//
// The PLANS constant above is kept for:
// 1. Backwards compatibility with sync code
// 2. Fallback when DB is unavailable
// 3. Initial seeding of SubscriptionPlanConfig table
