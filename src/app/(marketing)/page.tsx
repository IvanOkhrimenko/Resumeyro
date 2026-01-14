import Link from "next/link";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Sparkles,
  FileText,
  Upload,
  Wand2,
  Download,
  Check,
  Star,
  Zap,
  Globe,
  Shield,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Resumeyro - AI-Powered Resume Builder",
  description:
    "Build professional, ATS-friendly resumes in minutes. AI-powered writing assistant and templates for US, EU, and Ukrainian job markets.",
};

export default async function HomePage() {
  const t = await getTranslations("home");
  const tFeatures = await getTranslations("features");
  const tPlans = await getTranslations("plans");
  const tBilling = await getTranslations("billing");

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden pb-16 pt-20 md:pb-24 md:pt-32">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-100 opacity-60 blur-3xl dark:bg-amber-900/20" />
        <div className="pointer-events-none absolute -right-32 top-1/2 h-96 w-96 rounded-full bg-rose-100 opacity-40 blur-3xl dark:bg-rose-900/20" />

        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            {/* Badge */}
            <div className="mb-8 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <Sparkles className="h-4 w-4" />
                <span>AI-powered resume builder</span>
              </div>
            </div>

            {/* Main headline */}
            <h1 className="mb-6 text-center text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Stop writing resumes.
              <br />
              <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                Start landing jobs.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mb-10 max-w-2xl text-center text-lg text-zinc-600 dark:text-zinc-400 md:text-xl">
              Upload your old resume or just describe yourself. Our AI creates
              a professional, ATS-friendly resume tailored for{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                US, EU, or Ukrainian
              </span>{" "}
              job markets.
            </p>

            {/* CTA buttons */}
            <div className="mb-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-12 bg-zinc-900 px-8 text-base hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                asChild
              >
                <Link href="/register">
                  Create my resume
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="/ai-builder">Try AI Builder</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" />
                No credit card
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" />
                Free forever plan
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-500" />
                Export to PDF
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-zinc-200 bg-zinc-50 py-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full border-2 border-white bg-gradient-to-br from-zinc-300 to-zinc-400 dark:border-zinc-900 dark:from-zinc-600 dark:to-zinc-700"
                  />
                ))}
              </div>
              <span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  2,500+
                </span>{" "}
                resumes created
              </span>
            </div>
            <div className="hidden h-4 w-px bg-zinc-300 dark:bg-zinc-700 sm:block" />
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="h-4 w-4 fill-amber-400 text-amber-400"
                />
              ))}
              <span className="ml-1">Loved by job seekers</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Resume in 3 minutes, not 3 hours
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Our AI does the heavy lifting. You focus on what matters.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                icon: Upload,
                title: "Upload or describe",
                description:
                  "Drop your old resume, LinkedIn PDF, or just tell us about yourself. AI extracts everything.",
              },
              {
                step: "02",
                icon: Wand2,
                title: "AI creates magic",
                description:
                  "Our AI writes compelling content, optimizes for ATS, and formats everything beautifully.",
              },
              {
                step: "03",
                icon: Download,
                title: "Download & apply",
                description:
                  "Export a pixel-perfect PDF. Tweak anything in the canvas editor if you want.",
              },
            ].map((item, idx) => (
              <div key={idx} className="relative">
                {/* Connector line */}
                {idx < 2 && (
                  <div className="absolute left-full top-12 hidden h-px w-full bg-gradient-to-r from-zinc-300 to-transparent dark:from-zinc-700 md:block" />
                )}
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 transition-shadow hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
                      <item.icon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-mono text-4xl font-bold text-zinc-100 dark:text-zinc-800">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="border-t border-zinc-200 bg-zinc-50 py-20 dark:border-zinc-800 dark:bg-zinc-900/50 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              {t("featuresTitle")}
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {t("featuresSubtitle")}
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: tFeatures("aiWritingAssistant"),
                description: tFeatures("aiWritingAssistantDesc"),
                accent: "amber",
              },
              {
                icon: Globe,
                title: tFeatures("regionalTemplates"),
                description: tFeatures("regionalTemplatesDesc"),
                accent: "blue",
              },
              {
                icon: FileText,
                title: tFeatures("canvasEditor"),
                description: tFeatures("canvasEditorDesc"),
                accent: "violet",
              },
              {
                icon: MessageSquare,
                title: tFeatures("aiResumeReview"),
                description: tFeatures("aiResumeReviewDesc"),
                accent: "rose",
              },
              {
                icon: Shield,
                title: tFeatures("atsOptimized"),
                description: tFeatures("atsOptimizedDesc"),
                accent: "green",
              },
              {
                icon: Zap,
                title: tFeatures("pdfExport"),
                description: tFeatures("pdfExportDesc"),
                accent: "orange",
              },
            ].map((feature, idx) => {
              const accentClasses: Record<string, { bg: string; text: string }> = {
                amber: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
                blue: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
                violet: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-600 dark:text-violet-400" },
                rose: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400" },
                green: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-600 dark:text-green-400" },
                orange: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-600 dark:text-orange-400" },
              };
              const colors = accentClasses[feature.accent];

              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${colors.bg}`}>
                    <feature.icon className={`h-5 w-5 ${colors.text}`} />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Value proposition callout */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8 text-white dark:from-zinc-100 dark:via-zinc-50 dark:to-zinc-100 dark:text-zinc-900 md:p-12">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="mb-4 text-2xl font-bold md:text-3xl">
                  Your resume,
                  <br />
                  tailored for your market
                </h2>
                <p className="text-zinc-300 dark:text-zinc-600">
                  Different countries have different resume standards. US
                  employers expect no photo. European CVs follow Europass.
                  Ukrainian resumes are formal with photos. We handle it all.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { flag: "🇺🇸", label: "USA", detail: "No photo" },
                  { flag: "🇪🇺", label: "EU", detail: "Europass style" },
                  { flag: "🇺🇦", label: "Ukraine", detail: "Formal + photo" },
                ].map((region) => (
                  <div
                    key={region.label}
                    className="rounded-xl bg-white/10 p-4 text-center backdrop-blur dark:bg-zinc-900/10"
                  >
                    <div className="mb-2 text-3xl">{region.flag}</div>
                    <div className="font-semibold">{region.label}</div>
                    <div className="text-xs text-zinc-400 dark:text-zinc-500">
                      {region.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-zinc-200 bg-zinc-50 py-20 dark:border-zinc-800 dark:bg-zinc-900/50 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Simple pricing
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Start free. Upgrade when you need more AI power.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {[
              {
                name: tPlans("free"),
                price: "$0",
                description: tPlans("freeDesc"),
                features: [
                  tPlans("oneResume"),
                  tPlans("basicTemplates"),
                  tPlans("aiGenerationsMonth", { count: 3 }),
                  tPlans("pdfWithWatermark"),
                ],
                cta: "Get started",
                popular: false,
              },
              {
                name: tPlans("pro"),
                price: "$9",
                description: tPlans("proDesc"),
                features: [
                  tPlans("fiveResumes"),
                  tPlans("allTemplates"),
                  tPlans("aiGenerationsMonth", { count: 50 }),
                  tPlans("aiReviewsMonth", { count: 3 }),
                  tPlans("noWatermark"),
                ],
                cta: "Start Pro",
                popular: true,
              },
              {
                name: tPlans("premium"),
                price: "$19",
                description: tPlans("premiumDesc"),
                features: [
                  tPlans("unlimitedResumes"),
                  tPlans("allTemplates"),
                  tPlans("unlimitedAi"),
                  tPlans("prioritySupport"),
                  tPlans("customBranding"),
                ],
                cta: "Go Premium",
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 ${
                  plan.popular
                    ? "border-2 border-amber-500 bg-white shadow-lg dark:bg-zinc-900"
                    : "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-4 py-1 text-xs font-semibold text-white">
                    {tBilling("mostPopular")}
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {plan.description}
                  </p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {tBilling("perMonth")}
                  </span>
                </div>
                <ul className="mb-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600"
                      : ""
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href="/register">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              {t("ctaTitle")}
            </h2>
            <p className="mb-8 text-lg text-zinc-600 dark:text-zinc-400">
              {t("ctaSubtitle")}
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-12 bg-zinc-900 px-8 text-base hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                asChild
              >
                <Link href="/register">
                  {t("createResumeNow")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
              No credit card required. Your first resume is free forever.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
