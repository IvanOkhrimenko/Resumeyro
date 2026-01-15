"use client";

import { useState, useEffect } from "react";
import { FEATURE_FLAGS, type FeatureFlagKey } from "@/lib/feature-flags-shared";

interface FeatureFlagsState {
  features: Record<string, boolean>;
  isLoading: boolean;
  error: string | null;
}

export function useFeatureFlags() {
  const [state, setState] = useState<FeatureFlagsState>({
    features: {
      // Default all to true while loading
      [FEATURE_FLAGS.SMART_FORMATTING]: true,
      [FEATURE_FLAGS.AI_REVIEW]: true,
      [FEATURE_FLAGS.MULTI_MODEL_REVIEW]: true,
      [FEATURE_FLAGS.AI_TEXT_IMPROVEMENT]: true,
    },
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    fetch("/api/feature-flags")
      .then((res) => res.json())
      .then((data) => {
        setState({
          features: data.features || {},
          isLoading: false,
          error: null,
        });
      })
      .catch((err) => {
        console.error("Failed to fetch feature flags:", err);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to load feature flags",
        }));
      });
  }, []);

  const isEnabled = (key: FeatureFlagKey): boolean => {
    return state.features[key] ?? true;
  };

  return {
    ...state,
    isEnabled,
    // Convenience getters
    isSmartFormattingEnabled: state.features[FEATURE_FLAGS.SMART_FORMATTING] ?? true,
    isAIReviewEnabled: state.features[FEATURE_FLAGS.AI_REVIEW] ?? true,
    isMultiModelReviewEnabled: state.features[FEATURE_FLAGS.MULTI_MODEL_REVIEW] ?? true,
    isAITextImprovementEnabled: state.features[FEATURE_FLAGS.AI_TEXT_IMPROVEMENT] ?? true,
  };
}

// Export feature flag keys for use in components
export { FEATURE_FLAGS };
