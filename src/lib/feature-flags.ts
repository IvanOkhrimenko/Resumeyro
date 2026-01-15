import { db } from "./db";
import type { UserRole } from "@prisma/client";
import { FEATURE_FLAGS, type FeatureFlagKey } from "./feature-flags-shared";

// Re-export for convenience
export { FEATURE_FLAGS, type FeatureFlagKey } from "./feature-flags-shared";

// Default feature flag configurations
export const DEFAULT_FEATURE_FLAGS: Record<
  FeatureFlagKey,
  { name: string; nameUk: string; description: string; isEnabled: boolean }
> = {
  SMART_FORMATTING: {
    name: "Smart Formatting",
    nameUk: "Розумне форматування",
    description: "AI-powered style and formatting suggestions for resumes",
    isEnabled: true,
  },
  AI_REVIEW: {
    name: "AI Review",
    nameUk: "AI Ревью",
    description: "AI-powered resume review with suggestions and scoring",
    isEnabled: true,
  },
  MULTI_MODEL_REVIEW: {
    name: "Multi-Model Review",
    nameUk: "Мульти-модельне ревью",
    description: "Premium feature: review resumes using multiple AI models",
    isEnabled: true,
  },
  AI_TEXT_IMPROVEMENT: {
    name: "AI Text Improvement",
    nameUk: "AI покращення тексту",
    description: "AI-powered text rewriting and improvement",
    isEnabled: true,
  },
};

export interface FeatureFlagData {
  key: string;
  name: string;
  nameUk: string;
  description: string;
  isEnabled: boolean;
  allowedRoles: UserRole[];
}

// Get a single feature flag
export async function getFeatureFlag(key: FeatureFlagKey): Promise<FeatureFlagData> {
  const defaultConfig = DEFAULT_FEATURE_FLAGS[key];

  try {
    const flag = await db.featureFlag.findUnique({
      where: { key },
    });

    if (flag) {
      return {
        key: flag.key,
        name: defaultConfig.name,
        nameUk: defaultConfig.nameUk,
        description: defaultConfig.description,
        isEnabled: flag.isEnabled,
        allowedRoles: flag.allowedRoles,
      };
    }
  } catch {
    // Database might not be available
  }

  return {
    key,
    name: defaultConfig.name,
    nameUk: defaultConfig.nameUk,
    description: defaultConfig.description,
    isEnabled: defaultConfig.isEnabled,
    allowedRoles: [],
  };
}

// Get all feature flags
export async function getAllFeatureFlags(): Promise<FeatureFlagData[]> {
  const flags: FeatureFlagData[] = [];

  for (const key of Object.values(FEATURE_FLAGS)) {
    const flag = await getFeatureFlag(key);
    flags.push(flag);
  }

  return flags;
}

// Save a feature flag
export async function saveFeatureFlag(
  key: FeatureFlagKey,
  data: { isEnabled?: boolean; allowedRoles?: UserRole[] }
): Promise<void> {
  const defaultConfig = DEFAULT_FEATURE_FLAGS[key];

  await db.featureFlag.upsert({
    where: { key },
    update: {
      isEnabled: data.isEnabled,
      allowedRoles: data.allowedRoles,
    },
    create: {
      key,
      name: defaultConfig.name,
      description: defaultConfig.description,
      isEnabled: data.isEnabled ?? defaultConfig.isEnabled,
      allowedRoles: data.allowedRoles ?? [],
    },
  });
}

// Check if a feature is enabled for a specific user
export async function isFeatureEnabled(
  key: FeatureFlagKey,
  userRole?: UserRole | null
): Promise<boolean> {
  const flag = await getFeatureFlag(key);

  // If feature is globally enabled, everyone has access
  if (flag.isEnabled) {
    return true;
  }

  // If feature is disabled, check if user's role is in allowedRoles
  if (userRole && flag.allowedRoles.includes(userRole)) {
    return true;
  }

  return false;
}

// Check feature flag synchronously (for client-side use with pre-fetched data)
export function checkFeatureAccess(
  flag: FeatureFlagData,
  userRole?: UserRole | null
): boolean {
  if (flag.isEnabled) {
    return true;
  }

  if (userRole && flag.allowedRoles.includes(userRole)) {
    return true;
  }

  return false;
}
