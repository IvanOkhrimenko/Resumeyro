import { Metadata } from "next";
import { Shield, ArrowLeft } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resumeyro.com";

export const metadata: Metadata = {
  title: "Privacy Policy - Resumeyro | How We Protect Your Data",
  description: "Privacy Policy for Resumeyro AI Resume Builder. Learn how we collect, use, and protect your personal information. GDPR and CCPA compliant.",
  alternates: {
    canonical: `${baseUrl}/privacy`,
  },
  openGraph: {
    title: "Privacy Policy - Resumeyro",
    description: "Learn how Resumeyro protects your personal information and resume data.",
    url: `${baseUrl}/privacy`,
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PrivacyPolicyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("privacy");
  const tCommon = await getTranslations("common");
  const tFooter = await getTranslations("footer");
  const lastUpdated = "January 15, 2025";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Privacy Policy", url: `${baseUrl}/privacy` },
        ]}
      />
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            {tCommon("backToHome")}
          </Link>

          {/* Header */}
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t("title")}</h1>
                <p className="text-sm text-zinc-500">{t("lastUpdated", { date: lastUpdated })}</p>
              </div>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {t("intro")}
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section1Title")}</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section1_1Title")}</h3>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>{t("section1_1_account")}</strong></li>
                <li><strong>{t("section1_1_resume")}</strong></li>
                <li><strong>{t("section1_1_files")}</strong></li>
                <li><strong>{t("section1_1_payment")}</strong></li>
              </ul>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section1_2Title")}</h3>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>{t("section1_2_usage")}</strong></li>
                <li><strong>{t("section1_2_device")}</strong></li>
                <li><strong>{t("section1_2_cookies")}</strong></li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section2Title")}</h2>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>{t("section2_provide")}</strong></li>
                <li><strong>{t("section2_improve")}</strong></li>
                <li><strong>{t("section2_payments")}</strong></li>
                <li><strong>{t("section2_communications")}</strong></li>
                <li><strong>{t("section2_security")}</strong></li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section3Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {t("section3_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>{t("section3_sent")}</li>
                <li>{t("section3_retain")}</li>
                <li>{t("section3_noTrain")}</li>
                <li>{t("section3_deletion")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section4Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {t("section4_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>{t("section4_providers")}</strong></li>
                <li><strong>{t("section4_legal")}</strong></li>
                <li><strong>{t("section4_business")}</strong></li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section5Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section5_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400 mt-4">
                <li>{t("section5_https")}</li>
                <li>{t("section5_encrypted")}</li>
                <li>{t("section5_audits")}</li>
                <li>{t("section5_access")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section6Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {t("section6_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>{t("section6_access")}</strong></li>
                <li><strong>{t("section6_correction")}</strong></li>
                <li><strong>{t("section6_deletion")}</strong></li>
                <li><strong>{t("section6_portability")}</strong></li>
                <li><strong>{t("section6_optout")}</strong></li>
              </ul>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4">
                {t("section6_contact", { email: "privacy@resumeyro.com" })}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section7Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {t("section7_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>{t("section7_essential")}</strong></li>
                <li><strong>{t("section7_preferences")}</strong></li>
                <li><strong>{t("section7_analytics")}</strong></li>
              </ul>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4">
                {t("section7_control")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section8Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section8_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400 mt-4">
                <li>{t("section8_30days")}</li>
                <li>{t("section8_90days")}</li>
                <li>{t("section8_legal")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section9Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section9_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section10Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section10_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section11Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section11_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section12Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section12_text")}
              </p>
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-900 dark:text-zinc-100 font-medium">Resumeyro</p>
                <p className="text-zinc-600 dark:text-zinc-400">{t("contactEmail", { email: "privacy@resumeyro.com" })}</p>
              </div>
            </section>
          </div>

          {/* Footer links */}
          <div className="mt-12 flex flex-wrap gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <Link href="/terms" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              {tFooter("termsOfService")}
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              {tCommon("backToHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
