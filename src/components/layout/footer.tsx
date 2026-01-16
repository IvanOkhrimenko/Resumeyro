"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FileText } from "lucide-react";

export function Footer() {
  const t = useTranslations("footer");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");

  return (
    <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900">
                <FileText className="h-4 w-4" />
              </div>
              <span>{tCommon("appName")}</span>
            </Link>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Create professional resumes with AI assistance. Land your dream job faster.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("product")}</h3>
            <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              <li>
                <Link href="/pricing" className="hover:text-zinc-900 dark:hover:text-zinc-50">
                  {t("pricing")}
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-zinc-900 dark:hover:text-zinc-50">
                  {tNav("getStarted")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold">{t("legal")}</h3>
            <ul className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
              <li>
                <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-50">
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-50">
                  {t("termsOfService")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            {t("copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
