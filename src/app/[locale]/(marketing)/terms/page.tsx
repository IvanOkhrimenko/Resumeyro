import { Metadata } from "next";
import { FileText, ArrowLeft } from "lucide-react";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BreadcrumbJsonLd } from "@/components/seo/json-ld";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resumeyro.com";

export const metadata: Metadata = {
  title: "Terms of Service - Resumeyro | User Agreement",
  description: "Terms of Service for Resumeyro AI Resume Builder. Read our terms and conditions, subscription policies, and acceptable use guidelines.",
  alternates: {
    canonical: `${baseUrl}/terms`,
  },
  openGraph: {
    title: "Terms of Service - Resumeyro",
    description: "Read the terms and conditions for using Resumeyro AI Resume Builder.",
    url: `${baseUrl}/terms`,
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

export default async function TermsOfServicePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("terms");
  const tCommon = await getTranslations("common");
  const tFooter = await getTranslations("footer");
  const lastUpdated = "January 15, 2025";

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Terms of Service", url: `${baseUrl}/terms` },
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
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
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section1_text1")}
              </p>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4">
                {t("section1_text2")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section2Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section2_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400 mt-4">
                <li>{t("section2_creation")}</li>
                <li>{t("section2_ai")}</li>
                <li>{t("section2_templates")}</li>
                <li>{t("section2_pdf")}</li>
                <li>{t("section2_storage")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section3Title")}</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section3_1Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section3_1_text")}
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section3_2Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section3_2_text")}
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section3_3Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section3_3_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section4Title")}</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section4_1Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section4_1_text")}
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section4_2Title")}</h3>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>{t("section4_2_monthly")}</li>
                <li>{t("section4_2_stripe")}</li>
                <li>{t("section4_2_renew")}</li>
                <li>{t("section4_2_price")}</li>
              </ul>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section4_3Title")}</h3>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>{t("section4_3_cancel")}</li>
                <li>{t("section4_3_end")}</li>
                <li>{t("section4_3_refund")}</li>
                <li>{t("section4_3_contact")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section5Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {t("section5_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>{t("section5_illegal")}</li>
                <li>{t("section5_false")}</li>
                <li>{t("section5_security")}</li>
                <li>{t("section5_automated")}</li>
                <li>{t("section5_share")}</li>
                <li>{t("section5_malware")}</li>
                <li>{t("section5_ip")}</li>
                <li>{t("section5_harass")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section6Title")}</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section6_1Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section6_1_text")}
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section6_2Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section6_2_text")}
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section6_3Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section6_3_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section7Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {t("section7_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>{t("section7_accuracy")}</li>
                <li>{t("section7_review")}</li>
                <li>{t("section7_limits")}</li>
                <li>{t("section7_modify")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section8Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section8_text")} <Link href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">{tFooter("privacyPolicy")}</Link>
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section9Title")}</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section9_1Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section9_1_text")}
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section9_2Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section9_2_text")}
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">{t("section9_3Title")}</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section9_3_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section10Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section10_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400 mt-4">
                <li>{t("section10_indirect")}</li>
                <li>{t("section10_total")}</li>
                <li>{t("section10_data")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section11Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section11_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section12Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                {t("section12_intro")}
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>{t("section12_ends")}</li>
                <li>{t("section12_delete")}</li>
                <li>{t("section12_survive")}</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section13Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section13_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section14Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section14_text")}
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section15Title")}</h2>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>{t("section15_entire")}</strong></li>
                <li><strong>{t("section15_severability")}</strong></li>
                <li><strong>{t("section15_waiver")}</strong></li>
                <li><strong>{t("section15_assignment")}</strong></li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">{t("section16Title")}</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                {t("section16_text")}
              </p>
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-900 dark:text-zinc-100 font-medium">Resumeyro</p>
                <p className="text-zinc-600 dark:text-zinc-400">Email: <a href="mailto:legal@resumeyro.com" className="text-blue-600 hover:underline dark:text-blue-400">legal@resumeyro.com</a></p>
              </div>
            </section>
          </div>

          {/* Footer links */}
          <div className="mt-12 flex flex-wrap gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <Link href="/privacy" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              {tFooter("privacyPolicy")}
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
