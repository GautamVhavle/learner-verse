/**
 * Floating back-to-top button that appears after scrolling
 * past the hero section. Uses GSAP for entrance animation.
 */
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className={`fixed right-6 bottom-6 z-50 flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#030712]/90 text-white/60 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:text-white ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
