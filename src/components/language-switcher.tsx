"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  async function setLocale(newLocale: string) {
    // Set cookie for locale
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    // Refresh the page to apply new locale
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{currentLang.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={locale === lang.code ? "bg-zinc-100 dark:bg-zinc-800" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
