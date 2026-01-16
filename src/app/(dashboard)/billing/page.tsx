"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Loader2,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Zap,
  Crown,
  Users,
  Sparkles,
  FileText,
  Shield,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface PlanFeatures {
  maxResumes: number;
  aiGenerationsPerMonth: number;
  aiReviewsPerMonth: number;
  multiModelReview: boolean;
  pdfWatermark: boolean;
  prioritySupport: boolean;
}

interface Plan {
  key: string;
  name: string;
  nameUk: string | null;
  description: string | null;
  descriptionUk: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: PlanFeatures;
  sortOrder: number;
}

interface Subscription {
  plan: string;
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  isAdmin: boolean;
  limits: PlanFeatures;
}

function SuccessMessage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  if (!success) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
      <Check className="h-5 w-5" />
      <span>Your subscription has been updated successfully!</span>
    </div>
  );
}

function formatLimit(value: number): string {
  return value === -1 ? "Unlimited" : value.toString();
}

function getPlanIcon(key: string) {
  switch (key) {
    case "FREE":
      return <Users className="h-6 w-6" />;
    case "PRO":
      return <Zap className="h-6 w-6" />;
    case "PREMIUM":
      return <Crown className="h-6 w-6" />;
    default:
      return <CreditCard className="h-6 w-6" />;
  }
}

function getPlanColors(key: string, isCurrent: boolean) {
  if (isCurrent) {
    return {
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "border-violet-300 dark:border-violet-700 ring-2 ring-violet-500",
      icon: "bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400",
      badge: "bg-violet-600 text-white",
    };
  }

  switch (key) {
    case "FREE":
      return {
        bg: "bg-white dark:bg-zinc-800",
        border: "border-zinc-200 dark:border-zinc-700",
        icon: "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400",
        badge: "",
      };
    case "PRO":
      return {
        bg: "bg-white dark:bg-zinc-800",
        border: "border-blue-200 dark:border-blue-800",
        icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
        badge: "bg-blue-600 text-white",
      };
    case "PREMIUM":
      return {
        bg: "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20",
        border: "border-amber-300 dark:border-amber-700",
        icon: "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400",
        badge: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
      };
    default:
      return {
        bg: "bg-white dark:bg-zinc-800",
        border: "border-zinc-200 dark:border-zinc-700",
        icon: "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400",
        badge: "",
      };
  }
}

function FeatureRow({
  included,
  children,
}: {
  included: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5">
      {included ? (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        </div>
      ) : (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <X className="h-3 w-3 text-zinc-400" />
        </div>
      )}
      <span
        className={cn(
          "text-sm",
          included
            ? "text-zinc-700 dark:text-zinc-300"
            : "text-zinc-400 dark:text-zinc-500"
        )}
      >
        {children}
      </span>
    </li>
  );
}

function BillingContent() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([fetchSubscription(), fetchPlans()]).finally(() =>
      setIsLoading(false)
    );
  }, []);

  async function fetchSubscription() {
    try {
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    }
  }

  async function fetchPlans() {
    try {
      const res = await fetch("/api/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    }
  }

  async function openBillingPortal() {
    setIsPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsPortalLoading(false);
    }
  }

  async function handleUpgrade(planKey: string) {
    setUpgradingPlan(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setUpgradingPlan(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const currentPlanKey = subscription?.plan || "FREE";
  const currentPlan = plans.find((p) => p.key === currentPlanKey);
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                getPlanColors(currentPlanKey, true).icon
              )}
            >
              {getPlanIcon(currentPlanKey)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {currentPlan?.name || currentPlanKey} Plan
                </h2>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    subscription?.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                      : subscription?.status === "PAST_DUE"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400"
                        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                  )}
                >
                  {subscription?.status || "Active"}
                </span>
              </div>
              {currentPlan && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  ${currentPlan.priceMonthly}/month
                  {subscription?.currentPeriodEnd &&
                    currentPlanKey !== "FREE" && (
                      <>
                        {" "}
                        · Renews{" "}
                        {new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString()}
                      </>
                    )}
                </p>
              )}
            </div>
          </div>

          {subscription?.stripeCustomerId && (
            <Button
              variant="outline"
              onClick={openBillingPortal}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="mr-2 h-4 w-4" />
              )}
              Manage Billing
            </Button>
          )}
        </div>

        {subscription?.status === "PAST_DUE" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>
              Payment failed. Please update your payment method to continue
              using premium features.
            </span>
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          Available Plans
        </h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedPlans.map((plan) => {
            const isCurrent = plan.key === currentPlanKey;
            const colors = getPlanColors(plan.key, isCurrent);
            const isUpgrade =
              plan.sortOrder >
              (sortedPlans.find((p) => p.key === currentPlanKey)?.sortOrder ||
                0);
            const isDowngrade =
              plan.sortOrder <
              (sortedPlans.find((p) => p.key === currentPlanKey)?.sortOrder ||
                0);

            return (
              <div
                key={plan.key}
                className={cn(
                  "relative flex flex-col rounded-xl border p-6 transition-all",
                  colors.bg,
                  colors.border
                )}
              >
                {/* Current badge */}
                {isCurrent && (
                  <div className="absolute -top-3 left-4">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", colors.badge)}>
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Popular badge for PRO */}
                {plan.key === "PRO" && !isCurrent && (
                  <div className="absolute -top-3 left-4">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-medium", colors.badge)}>
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      colors.icon
                    )}
                  >
                    {getPlanIcon(plan.key)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-zinc-900 dark:text-white">
                      {plan.name}
                    </h4>
                    {plan.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                      ${plan.priceMonthly}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400">
                      /month
                    </span>
                  </div>
                  {plan.priceYearly > 0 && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      ${plan.priceYearly}/year (save $
                      {(plan.priceMonthly * 12 - plan.priceYearly).toFixed(0)})
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-6 flex-1 space-y-2.5">
                  <FeatureRow included={true}>
                    <span className="font-medium">
                      {formatLimit(plan.features.maxResumes)}
                    </span>{" "}
                    resume{plan.features.maxResumes !== 1 ? "s" : ""}
                  </FeatureRow>
                  <FeatureRow included={true}>
                    <span className="font-medium">
                      {formatLimit(plan.features.aiGenerationsPerMonth)}
                    </span>{" "}
                    AI generations/mo
                  </FeatureRow>
                  <FeatureRow
                    included={
                      plan.features.aiReviewsPerMonth > 0 ||
                      plan.features.aiReviewsPerMonth === -1
                    }
                  >
                    <span className="font-medium">
                      {plan.features.aiReviewsPerMonth === 0
                        ? "No"
                        : formatLimit(plan.features.aiReviewsPerMonth)}
                    </span>{" "}
                    AI reviews/mo
                  </FeatureRow>
                  <FeatureRow included={plan.features.multiModelReview}>
                    Multi-model AI review
                  </FeatureRow>
                  <FeatureRow included={!plan.features.pdfWatermark}>
                    PDF without watermark
                  </FeatureRow>
                  <FeatureRow included={plan.features.prioritySupport}>
                    Priority support
                  </FeatureRow>
                </ul>

                {/* Action Button */}
                <div className="mt-auto">
                  {isCurrent ? (
                    <Button disabled className="w-full" variant="outline">
                      <Check className="mr-2 h-4 w-4" />
                      Current Plan
                    </Button>
                  ) : isUpgrade ? (
                    <Button
                      className="w-full"
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={upgradingPlan === plan.key}
                    >
                      {upgradingPlan === plan.key ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Upgrade to {plan.name}
                    </Button>
                  ) : isDowngrade ? (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={openBillingPortal}
                      disabled={isPortalLoading || !subscription?.stripeCustomerId}
                    >
                      Downgrade
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Plan Features Detail */}
      {currentPlan && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <Shield className="h-5 w-5 text-violet-600" />
            What's Included in Your Plan
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {formatLimit(currentPlan.features.maxResumes)} Resumes
                </p>
                <p className="text-xs text-zinc-500">Create & manage</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <Bot className="h-5 w-5 text-violet-600" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {formatLimit(currentPlan.features.aiGenerationsPerMonth)} AI
                  Generations
                </p>
                <p className="text-xs text-zinc-500">Per month</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {currentPlan.features.aiReviewsPerMonth === 0
                    ? "No"
                    : formatLimit(currentPlan.features.aiReviewsPerMonth)}{" "}
                  AI Reviews
                </p>
                <p className="text-xs text-zinc-500">Per month</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Manage your subscription and billing information
        </p>
      </div>

      <Suspense fallback={null}>
        <SuccessMessage />
      </Suspense>

      <BillingContent />
    </div>
  );
}
