import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resumeyro.com";
  const currentDate = new Date();

  // Static pages with their priorities and change frequencies
  const staticPages = [
    {
      path: "",
      changeFrequency: "weekly" as const,
      priority: 1.0,
    },
    {
      path: "/pricing",
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      path: "/login",
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      path: "/register",
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      path: "/privacy",
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      path: "/terms",
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];

  // Generate sitemap entries for all locales
  const sitemapEntries: MetadataRoute.Sitemap = staticPages.flatMap((page) => {
    // Create entries for each locale
    return locales.map((locale) => {
      const url = `${baseUrl}/${locale}${page.path}`;

      // Generate alternates for all locales
      const languages: Record<string, string> = {};
      locales.forEach((l) => {
        languages[l] = `${baseUrl}/${l}${page.path}`;
      });

      return {
        url,
        lastModified: currentDate,
        changeFrequency: page.changeFrequency,
        priority: locale === defaultLocale ? page.priority : page.priority * 0.9,
        alternates: {
          languages,
        },
      };
    });
  });

  return sitemapEntries;
}
