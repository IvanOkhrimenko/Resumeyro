"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Loader2, Check, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PLANS } from "@/lib/constants";
import { useToast } from "@/components/ui/toast";

interface Subscription {
  plan: "FREE" | "PRO" | "PREMIUM";
  status: string;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
}

function SuccessMessage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");

  if (!success) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
      <Check className="h-5 w-5" />
      <span>Your subscription has been updated successfully!</span>
    </div>
  );
}

function BillingContent() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubscription();
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
    } finally {
      setIsLoading(false);
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

  async function handleUpgrade(plan: string) {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const currentPlan = subscription?.plan || "FREE";
  const planConfig = PLANS[currentPlan];

  return (
    <>
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Your current subscription details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{planConfig.name}</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                ${planConfig.price}/month
              </p>
            </div>
            <div
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                subscription?.status === "ACTIVE"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                  : subscription?.status === "PAST_DUE"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
                  : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              }`}
            >
              {subscription?.status || "Active"}
            </div>
          </div>

          {subscription?.currentPeriodEnd && currentPlan !== "FREE" && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your subscription renews on{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}

          {subscription?.status === "PAST_DUE" && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <AlertCircle className="h-5 w-5" />
              <span>Payment failed. Please update your payment method.</span>
            </div>
          )}

          <div className="flex gap-3">
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
            {currentPlan === "FREE" && (
              <Button onClick={() => handleUpgrade("PRO")}>
                Upgrade to Pro
              </Button>
            )}
            {currentPlan === "PRO" && (
              <Button onClick={() => handleUpgrade("PREMIUM")}>
                Upgrade to Premium
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
          <CardDescription>What's included in your plan</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                {planConfig.features.resumes === -1
                  ? "Unlimited"
                  : planConfig.features.resumes}{" "}
                resume{planConfig.features.resumes !== 1 ? "s" : ""}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                {planConfig.features.aiGenerations === -1
                  ? "Unlimited"
                  : planConfig.features.aiGenerations}{" "}
                AI generations/month
              </span>
            </li>
            <li className="flex items-center gap-3">
              {planConfig.features.aiReviews > 0 || planConfig.features.aiReviews === -1 ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <span className="h-4 w-4 text-zinc-400">-</span>
              )}
              <span className="text-sm">
                {planConfig.features.aiReviews === -1
                  ? "Unlimited AI reviews"
                  : planConfig.features.aiReviews === 0
                  ? "No AI reviews"
                  : `${planConfig.features.aiReviews} AI reviews/month`}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                PDF export {planConfig.features.watermark ? "with watermark" : "without watermark"}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                {planConfig.features.templates === "all" ? "All" : "Basic"} templates
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </>
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
