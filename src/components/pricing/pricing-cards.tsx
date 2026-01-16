"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { PLANS } from "@/lib/constants";

// Helper to format feature counts
const formatCount = (count: number) => count === -1 ? "Unlimited" : count.toString();

const plans = [
  {
    id: "FREE" as const,
    name: PLANS.FREE.name,
    price: PLANS.FREE.price,
    description: "Perfect for trying out the platform",
    features: [
      { text: `${PLANS.FREE.features.resumes} resume`, included: true },
      { text: "Basic templates", included: true },
      { text: `${PLANS.FREE.features.aiGenerations} AI generations/month`, included: true },
      { text: "PDF export with watermark", included: true },
      { text: "AI resume review", included: false },
      { text: "Premium templates", included: false },
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    id: "PRO" as const,
    name: PLANS.PRO.name,
    price: PLANS.PRO.price,
    description: "For professionals who need more",
    features: [
      { text: `${PLANS.PRO.features.resumes} resumes`, included: true },
      { text: "All templates", included: true },
      { text: `${PLANS.PRO.features.aiGenerations} AI generations/month`, included: true },
      { text: "PDF export without watermark", included: true },
      { text: `${PLANS.PRO.features.aiReviews} AI reviews/month`, included: true },
    ],
    cta: "Subscribe",
    popular: true,
  },
  {
    id: "PREMIUM" as const,
    name: PLANS.PREMIUM.name,
    price: PLANS.PREMIUM.price,
    description: "Unlimited everything for power users",
    features: [
      { text: `${formatCount(PLANS.PREMIUM.features.resumes)} resumes`, included: true },
      { text: "All templates", included: true },
      { text: `${formatCount(PLANS.PREMIUM.features.aiGenerations)} AI generations`, included: true },
      { text: "PDF export without watermark", included: true },
      { text: `${formatCount(PLANS.PREMIUM.features.aiReviews)} AI reviews`, included: true },
    ],
    cta: "Subscribe",
    popular: false,
  },
];

export function PricingCards() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubscribe = async (planId: string) => {
    if (planId === "FREE") {
      router.push("/register");
      return;
    }

    setIsLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else if (res.status === 401) {
        router.push("/login?redirect=/pricing");
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.id}
          className={cn(
            "relative flex flex-col",
            plan.popular && "ring-2 ring-zinc-900 dark:ring-white"
          )}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">
                <Sparkles className="h-3 w-3" />
                Most Popular
              </span>
            </div>
          )}

          <CardHeader className="pb-4 pt-6">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {plan.name}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {plan.description}
            </p>
            <div className="mt-4">
              <span className="text-4xl font-bold text-zinc-900 dark:text-white">
                ${plan.price}
              </span>
              {plan.price > 0 && (
                <span className="text-zinc-600 dark:text-zinc-400">/month</span>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col">
            <ul className="flex-1 space-y-3">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-zinc-400" />
                  )}
                  <span
                    className={cn(
                      "text-sm",
                      feature.included
                        ? "text-zinc-700 dark:text-zinc-300"
                        : "text-zinc-400"
                    )}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              className="mt-8 w-full"
              variant={plan.popular ? "default" : "outline"}
              onClick={() => handleSubscribe(plan.id)}
              disabled={isLoading !== null}
            >
              {isLoading === plan.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                plan.cta
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
