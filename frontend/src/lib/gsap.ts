/**
 * Centralized GSAP + ScrollTrigger setup.
 *
 * Import this module once at the app entry point to register
 * all GSAP plugins globally. Individual components no longer
 * need to call gsap.registerPlugin() themselves, but doing so
 * is harmless (GSAP deduplicates registrations).
 *
 * Respects prefers-reduced-motion: if the user has requested
 * reduced motion, GSAP globally disables animations and
 * ScrollTrigger immediately jumps to final states.
 */
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/* Respect prefers-reduced-motion */
if (
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  gsap.globalTimeline.timeScale(100);
  gsap.defaults({ duration: 0 });
}

export { gsap, ScrollTrigger };
