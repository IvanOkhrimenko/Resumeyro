import Link from "next/link";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Palette, Globe, Zap, Shield } from "lucide-react";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Resumeyro - Build Professional Resumes with AI",
  description: "Create professional resumes tailored for US, EU, and Ukrainian markets. AI-powered writing assistant, beautiful templates, and ATS optimization.",
  openGraph: {
    title: "Resumeyro - Build Professional Resumes with AI",
    description: "Create professional resumes with AI assistance. Templates for US, EU, and Ukrainian markets.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Resumeyro - Build Professional Resumes with AI",
    description: "Create professional resumes with AI assistance.",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <Header />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
            Build your perfect resume
            <br />
            <span className="text-zinc-500">with AI assistance</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Create professional resumes tailored for US, EU, and Ukrainian markets.
            Our AI helps you write compelling content and reviews your resume for maximum impact.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">Start for free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/templates">View templates</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">
              Everything you need to land your dream job
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
              Powerful features to help you create, optimize, and export professional resumes
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Palette className="h-6 w-6 text-zinc-900 dark:text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Canvas Editor
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Drag-and-drop editor with full customization. Add text, shapes, images, and more.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Sparkles className="h-6 w-6 text-zinc-900 dark:text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
                AI Writing Assistant
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Generate professional summaries, experience bullets, and skills with AI.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Globe className="h-6 w-6 text-zinc-900 dark:text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Regional Templates
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Templates designed for US, European, and Ukrainian job markets.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Zap className="h-6 w-6 text-zinc-900 dark:text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
                AI Resume Review
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Get detailed feedback and suggestions to improve your resume's impact.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <FileText className="h-6 w-6 text-zinc-900 dark:text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
                PDF Export
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Export high-quality PDFs ready to send to employers.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                <Shield className="h-6 w-6 text-zinc-900 dark:text-white" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">
                ATS Optimized
              </h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Resumes optimized for Applicant Tracking Systems used by employers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-zinc-900 px-6 py-16 text-center dark:bg-zinc-800 sm:px-16">
            <h2 className="text-3xl font-bold text-white">
              Ready to build your resume?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Join thousands of job seekers who have landed their dream jobs with Resumeyro.
            </p>
            <div className="mt-8">
              <Button size="lg" variant="secondary" asChild>
                <Link href="/register">Get started for free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">Resumeyro</span>
            </div>
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} Resumeyro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
