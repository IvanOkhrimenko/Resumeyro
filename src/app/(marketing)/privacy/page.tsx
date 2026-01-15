import { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - Resumeyro",
  description: "Privacy Policy for Resumeyro - AI-Powered Resume Builder. Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 15, 2025";

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          {/* Back link */}
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          {/* Header */}
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Privacy Policy</h1>
                <p className="text-sm text-zinc-500">Last updated: {lastUpdated}</p>
              </div>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Your privacy is important to us. This policy explains how Resumeyro collects, uses, and protects your personal information.
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">1.1 Information You Provide</h3>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Account Information:</strong> Email address, name, and password when you create an account</li>
                <li><strong>Resume Data:</strong> Work experience, education, skills, and other professional information you enter</li>
                <li><strong>Uploaded Files:</strong> Resumes, photos, and documents you upload to our service</li>
                <li><strong>Payment Information:</strong> Billing details processed securely through Stripe (we do not store credit card numbers)</li>
              </ul>

              <h3 className="text-lg font-medium mt-6 mb-3">1.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Usage Data:</strong> Pages visited, features used, and actions taken within the app</li>
                <li><strong>Device Information:</strong> Browser type, operating system, and device identifiers</li>
                <li><strong>Cookies:</strong> Session data and preferences (see Cookie section below)</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Provide Services:</strong> Create and manage your resumes, process AI-powered features</li>
                <li><strong>Improve the Product:</strong> Analyze usage patterns to enhance user experience</li>
                <li><strong>Process Payments:</strong> Handle subscriptions and billing through Stripe</li>
                <li><strong>Send Communications:</strong> Account notifications, security alerts, and optional marketing (with consent)</li>
                <li><strong>Ensure Security:</strong> Detect and prevent fraud, abuse, and security threats</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">3. AI Processing</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                We use third-party AI providers (OpenAI, Anthropic, Google) to power our resume generation and review features:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>Your resume content is sent to AI providers for processing</li>
                <li>AI providers may retain data according to their own privacy policies</li>
                <li>We do not use your data to train AI models</li>
                <li>You can request deletion of your data at any time</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">4. Data Sharing</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                We do not sell your personal information. We share data only with:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Service Providers:</strong> Stripe (payments), AI providers (content generation), hosting services</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">5. Data Security</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400 mt-4">
                <li>HTTPS encryption for all data transmission</li>
                <li>Encrypted database storage</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">6. Your Rights</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Depending on your location (GDPR, CCPA), you have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your resume data</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications</li>
              </ul>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4">
                To exercise these rights, contact us at <a href="mailto:privacy@resumeyro.com" className="text-blue-600 hover:underline dark:text-blue-400">privacy@resumeyro.com</a>
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">7. Cookies</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                We use cookies for:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Essential:</strong> Authentication, security, session management</li>
                <li><strong>Preferences:</strong> Language settings, theme preferences</li>
                <li><strong>Analytics:</strong> Understanding how users interact with our service (optional)</li>
              </ul>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4">
                You can control cookies through your browser settings.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">8. Data Retention</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                We retain your data for as long as your account is active. After account deletion:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400 mt-4">
                <li>Personal data is deleted within 30 days</li>
                <li>Backups are purged within 90 days</li>
                <li>Some data may be retained for legal compliance</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">9. International Transfers</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Your data may be processed in countries outside your residence. We ensure appropriate safeguards are in place, including Standard Contractual Clauses where required.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">10. Children's Privacy</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Our service is not intended for users under 16 years old. We do not knowingly collect data from children.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">11. Changes to This Policy</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                We may update this policy periodically. We will notify you of significant changes via email or in-app notification.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                For privacy-related questions or concerns:
              </p>
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-900 dark:text-zinc-100 font-medium">Resumeyro</p>
                <p className="text-zinc-600 dark:text-zinc-400">Email: <a href="mailto:privacy@resumeyro.com" className="text-blue-600 hover:underline dark:text-blue-400">privacy@resumeyro.com</a></p>
              </div>
            </section>
          </div>

          {/* Footer links */}
          <div className="mt-12 flex flex-wrap gap-4 border-t border-zinc-200 pt-8 dark:border-zinc-800">
            <Link href="/terms" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Terms of Service
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Back to Resumeyro
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
