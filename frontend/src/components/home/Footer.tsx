/**
 * Footer — clean 4-column layout with branding,
 * product links, resources, and social connect.
 */
import { Github, Twitter, MessageCircle } from "lucide-react";

const FOOTER_LINKS = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Course Hub", href: "#" },
    { label: "Pricing", href: "/pricing" },
  ],
  Resources: [
    { label: "Documentation", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Support", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Connect: [
    { label: "GitHub", href: "#", icon: Github },
    { label: "Twitter", href: "#", icon: Twitter },
    { label: "Discord", href: "#", icon: MessageCircle },
  ],
} as const;

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#020617]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="LearnerVerse" className="size-7" />
              <span className="text-base font-semibold text-white">
                LearnerVerse
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/40">
              Turn any YouTube playlist into a complete, AI-powered learning
              experience. Built for creators and learners.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/50">
                {title}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => {
                        if (link.href.startsWith("#") && link.href !== "#") {
                          e.preventDefault();
                          document
                            .querySelector(link.href)
                            ?.scrollIntoView({ behavior: "smooth" });
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
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} LearnerVerse. All rights reserved.
          </p>
          <p className="text-xs text-white/20">
            Made with ♥ for curious minds.
          </p>
        </div>
      </div>
    </footer>
  );
}
