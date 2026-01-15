// Shared feature flag constants - safe for client and server

export const FEATURE_FLAGS = {
  SMART_FORMATTING: "SMART_FORMATTING",
  AI_REVIEW: "AI_REVIEW",
  MULTI_MODEL_REVIEW: "MULTI_MODEL_REVIEW",
  AI_TEXT_IMPROVEMENT: "AI_TEXT_IMPROVEMENT",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
