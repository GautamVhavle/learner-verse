/**
 * Footer: clean 4-column layout with branding,
 * product links, resources, and social links.
 */
import { Github } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "MCP for IDEs", href: "#mcp" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "Testimonials", href: "#testimonials" },
  ],
  Resources: [
    { label: "GitHub", href: "https://github.com/GautamVhavle/learner-verse", icon: Github },
    { label: "Help Center", href: "/help" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#020617]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3">
          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="LearnerVerse" className="size-7" />
              <span className="text-base font-semibold text-white">LearnerVerse</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/45">
              Turn any YouTube playlist into a complete, AI-powered learning experience. Built for
              creators and learners.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-xs font-semibold tracking-wider text-white/50 uppercase">
                {title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.href.startsWith("http")
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      onClick={(e) => {
                        if (link.href.startsWith("#")) {
                          e.preventDefault();
                          document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className="flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
                    >
                      {"icon" in link && <link.icon className="size-3.5" />}
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/5 pt-8">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-3">
              <p className="text-xs text-white/30">
                © {new Date().getFullYear()} LearnerVerse. All rights reserved.
              </p>
              <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/40 sm:inline-flex">
                🇮🇳 Made in India
              </span>
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-4">
              <a
                href="https://github.com/GautamVhavle/learner-verse"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/30 transition-colors hover:text-white/60"
              >
                <Github className="size-3.5" />
                Star on GitHub
              </a>
              <p className="text-xs text-white/20">
                Made by{" "}
                <a
                  href="https://gautamvhavle.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 underline underline-offset-2 transition-colors hover:text-white/60"
                  style={{ textDecorationThickness: "1px" }}
                >
                  Gautam Vhavle
                </a>{" "}
                with ♥ for curious minds.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
