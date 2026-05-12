import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { Hero } from "@/components/site/Hero";
import { Pillars } from "@/components/site/Pillars";
import { FamilyDashboard } from "@/components/site/FamilyDashboard";
import { CareEcosystem } from "@/components/site/CareEcosystem";
import { Longevity } from "@/components/site/Longevity";
import { Testimonials } from "@/components/site/Testimonials";
import { Pricing } from "@/components/site/Pricing";
import { CTA } from "@/components/site/CTA";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <Pillars />
        <FamilyDashboard />
        <CareEcosystem />
        <Longevity />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <SiteFooter />
    </div>
  );
}
