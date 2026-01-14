import { Suspense } from "react";
import { Metadata } from "next";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { CanceledMessage } from "@/components/pricing/canceled-message";

export const metadata: Metadata = {
  title: "Pricing - Resume Builder",
  description: "Simple, transparent pricing for our AI-powered resume builder. Choose from Free, Pro, or Premium plans.",
  openGraph: {
    title: "Pricing - Resume Builder",
    description: "Simple, transparent pricing. Start free, upgrade when you need more.",
  },
};

export default function PricingPage() {
  return (
    <div className="bg-white dark:bg-zinc-950">
      {/* Page Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
              Choose the plan that works best for you. Upgrade or downgrade anytime.
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <CanceledMessage />
      </Suspense>

      {/* Pricing cards */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <PricingCards />

        {/* FAQ */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Frequently asked questions
          </h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-6 text-left">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Can I cancel anytime?
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                What payment methods do you accept?
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                We accept all major credit cards (Visa, Mastercard, American Express) through Stripe.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Can I upgrade or downgrade my plan?
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Yes, you can change your plan at any time. The difference will be prorated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
