import { Suspense } from "react";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { CanceledMessage } from "@/components/pricing/canceled-message";
import { ProductJsonLd, FAQJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resumeyro.com";

export const metadata: Metadata = {
  title: "Pricing - AI Resume Builder | Free, Pro & Premium Plans",
  description: "Simple, transparent pricing for Resumeyro AI resume builder. Free plan with 1 resume, Pro at $9/month for job seekers, Premium at $19/month for professionals.",
  keywords: [
    "resume builder pricing",
    "AI resume cost",
    "free resume builder",
    "professional resume plans",
    "CV maker pricing",
  ],
  alternates: {
    canonical: `${baseUrl}/pricing`,
  },
  openGraph: {
    title: "Pricing - Resumeyro AI Resume Builder",
    description: "Simple, transparent pricing. Free plan forever, Pro at $9/mo, Premium at $19/mo.",
    url: `${baseUrl}/pricing`,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Resumeyro Pricing Plans",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Resumeyro AI Resume Builder",
    description: "Simple, transparent pricing. Free plan forever.",
    images: ["/og-image.png"],
  },
};

const pricingFaqs = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, Mastercard, American Express) through Stripe.",
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer: "Yes, you can change your plan at any time. The difference will be prorated.",
  },
];

const pricingOffers = [
  { name: "Free Plan", price: "0", priceCurrency: "USD" },
  { name: "Pro Plan", price: "9", priceCurrency: "USD" },
  { name: "Premium Plan", price: "19", priceCurrency: "USD" },
];

export default async function PricingPage() {
  const t = await getTranslations("pricing");

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Pricing", url: `${baseUrl}/pricing` },
        ]}
      />
      <ProductJsonLd
        name="Resumeyro AI Resume Builder"
        description="AI-powered resume builder with professional templates for US, EU, and Ukrainian job markets."
        offers={pricingOffers}
      />
      <FAQJsonLd faqs={pricingFaqs} />

    <div className="bg-white dark:bg-zinc-950">
      {/* Page Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
              {t("subtitle")}
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
            {t("faqTitle")}
          </h2>
          <div className="mx-auto mt-8 max-w-2xl space-y-6 text-left">
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                {t("faq1Question")}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t("faq1Answer")}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                {t("faq2Question")}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t("faq2Answer")}
              </p>
            </div>
            <div>
              <h3 className="font-medium text-zinc-900 dark:text-white">
                {t("faq3Question")}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t("faq3Answer")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
