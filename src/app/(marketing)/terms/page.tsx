import { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service - Resumeyro",
  description: "Terms of Service for Resumeyro - AI-Powered Resume Builder. Read our terms and conditions for using our service.",
};

export default function TermsOfServicePage() {
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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <FileText className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Terms of Service</h1>
                <p className="text-sm text-zinc-500">Last updated: {lastUpdated}</p>
              </div>
            </div>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Please read these terms carefully before using Resumeyro. By using our service, you agree to these terms.
            </p>
          </div>

          {/* Content */}
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                By accessing or using Resumeyro ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
              </p>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4">
                We may modify these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Resumeyro is an AI-powered resume building platform that provides:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400 mt-4">
                <li>Resume creation and editing tools</li>
                <li>AI-powered content generation and review</li>
                <li>Professional templates for various markets (US, EU, Ukraine)</li>
                <li>PDF export functionality</li>
                <li>Cloud storage for your resumes</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">3. User Accounts</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">3.1 Registration</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account credentials.
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">3.2 Account Responsibility</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                You are responsible for all activities that occur under your account. Notify us immediately of any unauthorized use.
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">3.3 Age Requirement</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                You must be at least 16 years old to use the Service. By using Resumeyro, you represent that you meet this requirement.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">4. Subscriptions and Payments</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">4.1 Free and Paid Plans</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We offer free and paid subscription plans. Paid plans provide additional features as described on our pricing page.
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">4.2 Billing</h3>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>Paid subscriptions are billed monthly or annually</li>
                <li>Payments are processed through Stripe</li>
                <li>Subscriptions automatically renew unless cancelled</li>
                <li>Prices may change with 30 days notice</li>
              </ul>

              <h3 className="text-lg font-medium mt-6 mb-3">4.3 Cancellation and Refunds</h3>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>You can cancel your subscription at any time</li>
                <li>Cancellation takes effect at the end of the current billing period</li>
                <li>Refunds are provided within 7 days of purchase if you haven't used AI features</li>
                <li>Contact support for refund requests</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">5. Acceptable Use</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                You agree NOT to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>Use the Service for any illegal purpose</li>
                <li>Submit false or misleading information</li>
                <li>Attempt to bypass security measures or access restrictions</li>
                <li>Use automated tools to access the Service without permission</li>
                <li>Share your account with others or resell access</li>
                <li>Upload malicious content or malware</li>
                <li>Infringe on intellectual property rights</li>
                <li>Harass, abuse, or harm others</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">6. Intellectual Property</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">6.1 Your Content</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                You retain ownership of the content you create. By using the Service, you grant us a license to store, process, and display your content as necessary to provide the Service.
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">6.2 Our Content</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                The Service, including templates, designs, and software, is owned by Resumeyro. You may not copy, modify, or redistribute our content without permission.
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">6.3 AI-Generated Content</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Content generated by AI based on your input belongs to you. However, similar content may be generated for other users based on their input.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">7. AI Services</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Our AI features are powered by third-party providers. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>AI-generated content may not always be accurate or appropriate</li>
                <li>You are responsible for reviewing and editing AI suggestions</li>
                <li>AI usage is subject to fair use limits based on your plan</li>
                <li>We may modify or discontinue AI features with notice</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">8. Privacy</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Your use of the Service is subject to our <Link href="/privacy" className="text-blue-600 hover:underline dark:text-blue-400">Privacy Policy</Link>, which explains how we collect, use, and protect your data.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">9. Disclaimers</h2>

              <h3 className="text-lg font-medium mt-6 mb-3">9.1 Service Availability</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free operation.
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">9.2 Resume Effectiveness</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We do not guarantee that resumes created with our Service will result in job interviews or employment. Success depends on many factors beyond our control.
              </p>

              <h3 className="text-lg font-medium mt-6 mb-3">9.3 Third-Party Services</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We are not responsible for third-party services (Stripe, AI providers) used in connection with the Service.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">10. Limitation of Liability</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                To the maximum extent permitted by law:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400 mt-4">
                <li>We are not liable for indirect, incidental, or consequential damages</li>
                <li>Our total liability is limited to the amount you paid us in the past 12 months</li>
                <li>We are not liable for data loss; you should maintain backups</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">11. Indemnification</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">12. Termination</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                We may suspend or terminate your account if you violate these Terms. Upon termination:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li>Your right to use the Service ends immediately</li>
                <li>We may delete your data after 30 days</li>
                <li>Sections that should survive termination will remain in effect</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">13. Governing Law</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                These Terms are governed by the laws of Ukraine. Any disputes shall be resolved in the courts of Kyiv, Ukraine, unless local consumer protection laws require otherwise.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">14. Dispute Resolution</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Before filing a legal claim, you agree to try to resolve disputes informally by contacting us. If we cannot resolve the dispute within 30 days, either party may proceed with legal action.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">15. General Provisions</h2>
              <ul className="list-disc pl-6 space-y-2 text-zinc-600 dark:text-zinc-400">
                <li><strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and Resumeyro</li>
                <li><strong>Severability:</strong> If any provision is unenforceable, the rest remains in effect</li>
                <li><strong>No Waiver:</strong> Our failure to enforce a right does not waive that right</li>
                <li><strong>Assignment:</strong> You may not transfer your rights under these Terms</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-xl font-semibold mb-4">16. Contact Us</h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                For questions about these Terms:
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
              Privacy Policy
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
