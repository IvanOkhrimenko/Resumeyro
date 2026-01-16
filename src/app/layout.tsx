import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://resumeyro.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  verification: {
    google: "ziiz7vlQ96nn9FO17eaDhOX-9HrDn0nPEf",
  },
  title: {
    default: "Resumeyro - AI-Powered Resume Builder | Create Professional Resumes",
    template: "%s | Resumeyro",
  },
  description:
    "Create stunning, ATS-friendly resumes with AI assistance. Professional templates for US, EU, and Ukrainian job markets. Free to start.",
  keywords: [
    "resume builder",
    "CV creator",
    "AI resume",
    "professional resume",
    "job application",
    "ATS-friendly resume",
    "resume templates",
    "CV maker",
    "online resume builder",
    "free resume builder",
  ],
  authors: [{ name: "Resumeyro" }],
  creator: "Resumeyro",
  publisher: "Resumeyro",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "uk_UA",
    url: baseUrl,
    siteName: "Resumeyro",
    title: "Resumeyro - AI-Powered Resume Builder",
    description:
      "Create stunning, ATS-friendly resumes with AI assistance. Professional templates for US, EU, and Ukrainian job markets.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Resumeyro - AI-Powered Resume Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Resumeyro - AI-Powered Resume Builder",
    description:
      "Create stunning, ATS-friendly resumes with AI assistance. Free to start.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
    languages: {
      "en-US": `${baseUrl}/en`,
      "uk-UA": `${baseUrl}/uk`,
    },
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
