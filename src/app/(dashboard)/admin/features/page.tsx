"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  ToggleLeft,
  Loader2,
  AlertTriangle,
  Save,
  Palette,
  MessageSquareText,
  ClipboardCheck,
  Layers,
  Shield,
  Users,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

interface FeatureFlag {
  key: string;
  name: string;
  nameUk: string;
  description: string;
  isEnabled: boolean;
  allowedRoles: UserRole[];
}

const featureIcons: Record<string, React.ElementType> = {
  SMART_FORMATTING: Palette,
  AI_REVIEW: ClipboardCheck,
  MULTI_MODEL_REVIEW: Layers,
  AI_TEXT_IMPROVEMENT: MessageSquareText,
};

const featureTranslationKeys: Record<string, string> = {
  SMART_FORMATTING: "featureSmartFormatting",
  AI_REVIEW: "featureAiReview",
  MULTI_MODEL_REVIEW: "featureMultiModelReview",
  AI_TEXT_IMPROVEMENT: "featureAiTextImprovement",
};

const roleTranslationKeys: Record<UserRole, string> = {
  USER: "roleUser",
  ADMIN: "roleAdmin",
};

export default function FeaturesPage() {
  const t = useTranslations("adminFeatures");
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchFlags();
  }, []);

  function showSuccess(message: string) {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }

  async function fetchFlags() {
    try {
      const res = await fetch("/api/admin/feature-flags");
      if (res.status === 403) {
        setError(t("adminRequired"));
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFlags(data.flags || []);
      setAvailableRoles(data.availableRoles || []);
    } catch {
      setError(t("failedToLoad"));
    } finally {
      setIsLoading(false);
    }
  }

  async function saveFlag(flag: FeatureFlag) {
    setSavingKey(flag.key);
    try {
      const res = await fetch("/api/admin/feature-flags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: flag.key,
          isEnabled: flag.isEnabled,
          allowedRoles: flag.allowedRoles,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      const featureName = t(featureTranslationKeys[flag.key] || flag.key);
      showSuccess(t("featureUpdated", { feature: featureName }));
    } catch {
      setError(t("failedToSave"));
    } finally {
      setSavingKey(null);
    }
  }

  function toggleEnabled(key: string) {
    setFlags((prev) =>
      prev.map((f) => (f.key === key ? { ...f, isEnabled: !f.isEnabled } : f))
    );
  }

  function toggleRole(key: string, role: UserRole) {
    setFlags((prev) =>
      prev.map((f) => {
        if (f.key !== key) return f;
        const hasRole = f.allowedRoles.includes(role);
        return {
          ...f,
          allowedRoles: hasRole
            ? f.allowedRoles.filter((r) => r !== role)
            : [...f.allowedRoles, role],
        };
      })
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
        <h2 className="mt-2 text-lg font-semibold text-red-700 dark:text-red-400">
          {error}
        </h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-2 text-white shadow-lg">
          {successMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
          <ToggleLeft className="h-6 w-6 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {t("title")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium">{t("howItWorks")}</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-blue-700 dark:text-blue-300">
              <li>
                {t("howItWorksEnabled")}
              </li>
              <li>
                {t("howItWorksDisabled")}
              </li>
              <li>
                {t("howItWorksRoles")}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="space-y-4">
        {flags.map((flag) => {
          const Icon = featureIcons[flag.key] || ToggleLeft;
          const isSaving = savingKey === flag.key;

          return (
            <div
              key={flag.key}
              className={cn(
                "rounded-lg border bg-white p-5 transition-all dark:bg-zinc-800",
                flag.isEnabled
                  ? "border-emerald-200 dark:border-emerald-800"
                  : "border-zinc-200 dark:border-zinc-700"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left side - Info */}
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl",
                      flag.isEnabled
                        ? "bg-emerald-100 dark:bg-emerald-900/30"
                        : "bg-zinc-100 dark:bg-zinc-700"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6",
                        flag.isEnabled
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      )}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-white">
                      {t(featureTranslationKeys[flag.key] || flag.key)}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {flag.description}
                    </p>
                  </div>
                </div>

                {/* Right side - Toggle */}
                <button
                  onClick={() => toggleEnabled(flag.key)}
                  className={cn(
                    "relative h-7 w-14 shrink-0 rounded-full transition-colors",
                    flag.isEnabled
                      ? "bg-emerald-500"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform shadow-sm",
                      flag.isEnabled && "translate-x-7"
                    )}
                  />
                </button>
              </div>

              {/* Allowed Roles Section - Only show when disabled */}
              {!flag.isEnabled && (
                <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-700">
                  <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                    <Users className="h-4 w-4" />
                    <span>{t("allowedRoles")}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {availableRoles.map((role) => {
                      const isSelected = flag.allowedRoles.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => toggleRole(flag.key, role)}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
                            isSelected
                              ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-600"
                          )}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5" />}
                          {t(roleTranslationKeys[role])}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => saveFlag(flag)}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {t("save")}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
