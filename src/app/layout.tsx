import type { Metadata } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { Providers } from "./providers";
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

export const metadata: Metadata = {
  title: {
    default: "Resumeyro - Create Professional Resumes with AI",
    template: "%s | Resumeyro",
  },
  description:
    "Create stunning, ATS-friendly resumes with AI assistance. Professional templates, smart suggestions, and instant PDF export.",
  keywords: [
    "resume builder",
    "CV creator",
    "AI resume",
    "professional resume",
    "job application",
  ],
  authors: [{ name: "Resumeyro" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Resumeyro",
    title: "Resumeyro - Create Professional Resumes with AI",
    description:
      "Create stunning, ATS-friendly resumes with AI assistance. Professional templates, smart suggestions, and instant PDF export.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resumeyro - Create Professional Resumes with AI",
    description:
      "Create stunning, ATS-friendly resumes with AI assistance.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
