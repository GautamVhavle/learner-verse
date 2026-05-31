import { useEffect } from "react";
import { Link } from "react-router";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "Privacy Policy | LearnerVerse";
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
        <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
        <p className="mb-8 text-sm text-white/50">Last updated: May 21, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-white/70">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">1. Introduction</h2>
            <p>
              LearnerVerse (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the website{" "}
              <a href="https://learnerverse.xyz" className="text-blue-400 underline">
                learnerverse.xyz
              </a>
              . This Privacy Policy explains how we collect, use, and protect your personal
              information when you use our platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">2. Information We Collect</h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>
                <strong className="text-white/90">Account information:</strong> When you sign up via
                Auth0, we receive your name, email address, and profile picture.
              </li>
              <li>
                <strong className="text-white/90">Usage data:</strong> We track course progress,
                quiz scores, streaks, and study session activity to provide learning analytics.
              </li>
              <li>
                <strong className="text-white/90">Content you create:</strong> Courses, study notes,
                discussion messages, and quiz attempts are stored on our servers.
              </li>
              <li>
                <strong className="text-white/90">Technical data:</strong> Browser type, device
                information, and IP address for security and performance purposes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">
              3. How We Use Your Information
            </h2>
            <ul className="ml-4 list-disc space-y-2">
              <li>To provide, maintain, and improve the LearnerVerse platform</li>
              <li>To track your learning progress, streaks, and generate certificates</li>
              <li>To power AI features (LiVi AI chat, quiz generation, course organization)</li>
              <li>To send important account and service notifications</li>
              <li>To prevent fraud and ensure platform security</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">4. Data Sharing</h2>
            <p>
              We do not sell your personal data. We may share data with third-party services that
              help us operate the platform:
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-2">
              <li>
                <strong className="text-white/90">Auth0:</strong> Authentication and identity
                management
              </li>
              <li>
                <strong className="text-white/90">OpenRouter:</strong> AI-powered features (lesson
                content is sent for quiz generation and AI chat)
              </li>
              <li>
                <strong className="text-white/90">YouTube:</strong> Video embedding via YouTube's
                official iframe API
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. You can request deletion of
              your account and associated data at any time through your account settings. Upon
              account deletion, your personal data is permanently removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="mt-2 ml-4 list-disc space-y-2">
              <li>Access and download your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Object to processing of your data</li>
              <li>Data portability</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">7. Cookies</h2>
            <p>
              We use essential cookies for authentication and theme preferences. We use localStorage
              to persist your learning progress and app settings. No third-party tracking cookies
              are used on the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">8. Security</h2>
            <p>
              We implement industry-standard security measures including HTTPS encryption, secure
              authentication via Auth0 with JWT RS256 tokens, and regular security audits. However,
              no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">9. Open Source & Self-Hosting</h2>
            <p>
              LearnerVerse is open source. If you self-host the platform, you are responsible for
              your own data handling practices. This privacy policy applies only to the hosted
              version at learnerverse.xyz.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any
              significant changes by posting the new policy on this page with an updated revision
              date.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">11. Contact</h2>
            <p>
              If you have questions about this Privacy Policy, you can reach us via our{" "}
              <a
                href="https://github.com/GautamVhavle/learner-verse/issues"
                className="text-blue-400 underline"
              >
                GitHub Issues
              </a>{" "}
              page.
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
