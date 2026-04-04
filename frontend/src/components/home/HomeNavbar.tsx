/**
 * Sticky glassmorphic navigation bar for the landing page.
 *
 * Transparent on top, gains a glass background on scroll.
 * Responsive: desktop inline links, mobile hamburger → Sheet.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Menu, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useMode } from "@/hooks/useMode";
import { SINGLE_USER_MODE } from "@/lib/auth";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Testimonials", href: "#testimonials" },
] as const;

export function HomeNavbar() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { mode } = useMode();
  const navRef = useRef<HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleCTA = () => {
    if (SINGLE_USER_MODE || isSignedIn) {
      const path = mode === "creator" ? "/creator" : "/learner";
      navigate(path);
    } else {
      navigate("/login");
    }
  };

  useEffect(() => {
    if (!navRef.current) return;

    const ctx = gsap.context(() => {
      // Glass effect on scroll
      gsap.to(navRef.current, {
        scrollTrigger: {
          trigger: document.body,
          start: "80px top",
          end: "80px top",
          toggleActions: "play none none reverse",
        },
        backgroundColor: "rgba(3, 7, 18, 0.8)",
        backdropFilter: "blur(20px)",
        borderBottomColor: "rgba(255, 255, 255, 0.08)",
        duration: 0.3,
        ease: "power2.out",
      });

      // Staggered entrance
      gsap.fromTo(
        ".nav-item",
        { opacity: 0, y: -10 },
        { opacity: 1, y: 0, stagger: 0.08, duration: 0.5, ease: "power2.out", delay: 0.2 }
      );
    });

    return () => ctx.revert();
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      ref={navRef}
      className="fixed inset-x-0 top-0 z-50 border-b border-transparent transition-colors"
      style={{ backgroundColor: "transparent", backdropFilter: "none" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="nav-item flex items-center gap-2.5"
        >
          <img src="/logo.svg" alt="LearnerVerse" className="size-8" />
          <span className="text-lg font-semibold tracking-tight text-white">
            LearnerVerse
          </span>
        </button>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="nav-item text-sm font-medium text-white/60 transition-colors hover:text-white"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block">
          <Button
            onClick={handleCTA}
            className="nav-item gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#030712] hover:bg-white/90"
          >
            {isSignedIn ? "Dashboard" : "Get Started"}
            <ArrowRight className="size-3.5" />
          </Button>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger>
              <span className="nav-item inline-flex p-2 text-white/70 hover:text-white">
                <Menu className="size-5" />
              </span>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-72 border-white/10 bg-[#030712]"
            >
              <div className="flex flex-col gap-6 pt-8">
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollTo(link.href)}
                    className="text-left text-base font-medium text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </button>
                ))}
                <Button
                  onClick={() => {
                    setMobileOpen(false);
                    handleCTA();
                  }}
                  className="mt-4 gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#030712] hover:bg-white/90"
                >
                  {isSignedIn ? "Dashboard" : "Get Started"}
                  <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
