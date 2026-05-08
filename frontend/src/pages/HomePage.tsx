/**
 * LearnerVerse Landing Page — fully public marketing page.
 * No auth checks or redirects. The navbar CTA handles navigation.
 */
import { HomeNavbar } from "@/components/home/HomeNavbar";
import { HeroSection } from "@/components/home/HeroSection";
import { SocialProofBar } from "@/components/home/SocialProofBar";
import { ProblemSolution } from "@/components/home/ProblemSolution";
import { FeaturesBento } from "@/components/home/FeaturesBento";
import { AIShowcase } from "@/components/home/AIShowcase";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { StatsSection } from "@/components/home/StatsSection";
import { PricingSection } from "@/components/home/PricingSection";
import { CTASection } from "@/components/home/CTASection";
import { Footer } from "@/components/home/Footer";
import { PAYMENT_GATEWAY_ENABLED } from "@/lib/payment";

export default function HomePage() {
  return (
    <div className="min-h-screen w-full overflow-x-clip scroll-smooth bg-[#030712] text-white antialiased">
      <HomeNavbar />
      <main>
        <HeroSection />
        <SocialProofBar />
        <ProblemSolution />
        <FeaturesBento />
        <AIShowcase />
        <HowItWorks />
        <Testimonials />
        <StatsSection />
        {PAYMENT_GATEWAY_ENABLED && <PricingSection />}
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
