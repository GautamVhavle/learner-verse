import { useEffect } from "react";
import { Link } from "react-router";

export default function TermsPage() {
  useEffect(() => {
    document.title = "Terms of Service — LearnerVerse";
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <nav className="border-b border-white/5 px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="LearnerVerse" className="size-7" />
            <span className="text-base font-semibold">LearnerVerse</span>
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
        <p className="mb-8 text-sm text-white/50">Last updated: May 21, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing or using LearnerVerse at{" "}
              <a href="https://learnerverse.xyz" className="text-blue-400 underline">
                learnerverse.xyz
              </a>
              , you agree to be bound by these Terms of Service. If you do not agree, please do not
              use the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Description of Service</h2>
            <p>
              LearnerVerse is an AI-powered learning platform that transforms YouTube videos and
              playlists into structured courses. The service includes course creation, AI-generated
              quizzes, progress tracking, certificates, discussion rooms, and an AI study companion
              (LiVi).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">3. User Accounts</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>You must provide accurate information when creating an account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must be at least 13 years old to use LearnerVerse.</li>
              <li>One person may not maintain more than one account.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="mt-2 ml-4 list-disc space-y-2">
              <li>Use the platform for any unlawful purpose</li>
              <li>Upload harmful, offensive, or misleading content</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Interfere with or disrupt the platform&apos;s infrastructure</li>
              <li>Scrape, crawl, or collect data from the platform without permission</li>
              <li>Use the platform to distribute spam or unsolicited messages</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Content & YouTube Videos</h2>
            <p>
              LearnerVerse embeds YouTube videos using YouTube&apos;s official iframe API. We do not
              host, download, or redistribute any video content. All video rights remain with the
              original creators and YouTube. Course structures, notes, and quizzes created on
              LearnerVerse are user-generated content.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Intellectual Property</h2>
            <p>
              The LearnerVerse platform, including its design, logo, and codebase, is protected
              under the Business Source License 1.1 (BSL-1.1). The source code is available on
              GitHub for non-commercial use. Commercial use requires written permission from the
              author.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Free & Pro Plans</h2>
            <p>
              Core features are free forever. The optional Pro plan unlocks AI-powered features. Pro
              subscriptions are billed monthly or annually. You may cancel at any time, and your Pro
              access will continue until the end of your billing period.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Certificates</h2>
            <p>
              Certificates issued by LearnerVerse indicate completion of a course on our platform.
              They are not accredited by any educational institution. Each certificate has a unique
              verifiable link.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms. You
              may delete your account at any time through your account settings. Upon termination,
              your data will be handled according to our{" "}
              <Link to="/privacy" className="text-blue-400 underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Limitation of Liability</h2>
            <p>
              LearnerVerse is provided &quot;as is&quot; without warranties of any kind. We are not
              liable for any damages arising from your use of the platform, including but not
              limited to loss of data, interruption of service, or inaccuracies in AI-generated
              content.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">11. Changes to Terms</h2>
            <p>
              We may update these Terms of Service from time to time. Continued use of the platform
              after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">12. Contact</h2>
            <p>
              For questions about these Terms of Service, please reach out via{" "}
              <a
                href="https://github.com/GautamVhavle/learner-verse/issues"
                className="text-blue-400 underline"
              >
                GitHub Issues
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-white/5 pt-6 text-center">
          <Link to="/" className="text-sm text-white/40 hover:text-white/70">
            ← Back to LearnerVerse
          </Link>
        </div>
      </main>
    </div>
  );
}
