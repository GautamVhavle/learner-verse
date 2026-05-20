/**
 * LearnerVerse Landing Page: fully public marketing page.
 * No auth checks or redirects. The navbar CTA handles navigation.
 */
import { useEffect } from "react";
import { HomeNavbar } from "@/components/home/HomeNavbar";
import { HeroSection } from "@/components/home/HeroSection";
import { SocialProofBar } from "@/components/home/SocialProofBar";
import { ProblemSolution } from "@/components/home/ProblemSolution";
import { FeaturesBento } from "@/components/home/FeaturesBento";
import { AIShowcase } from "@/components/home/AIShowcase";
import { CreatorShowcase } from "@/components/home/CreatorShowcase";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { StatsSection } from "@/components/home/StatsSection";
import { PricingSection } from "@/components/home/PricingSection";
import { FAQSection } from "@/components/home/FAQSection";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/home/Footer";
import { BackToTop } from "@/components/home/BackToTop";

/** Horizontal gradient divider between sections. */
function SectionDivider() {
  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
}

export default function HomePage() {
  useEffect(() => {
    document.title =
      "LearnerVerse — Turn Any YouTube Playlist into a Course with AI Quizzes";
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-clip scroll-smooth bg-[#030712] text-white antialiased">
      <HomeNavbar />
      <main>
        <HeroSection />
        <SocialProofBar />
        <SectionDivider />
        <ProblemSolution />
        <SectionDivider />
        <FeaturesBento />
        <SectionDivider />
        <AIShowcase />
        <SectionDivider />
        <CreatorShowcase />
        <SectionDivider />
        <HowItWorks />
        <SectionDivider />
        <Testimonials />
        <SectionDivider />
        <StatsSection />
        <SectionDivider />
        <PricingSection />
        <SectionDivider />
        <FAQSection />
        <SectionDivider />
        <CTASection />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
