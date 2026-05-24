import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/solutions/home-care")({
  head: () => ({
    meta: [
      { title: "Home Care — Olia" },
      { name: "description", content: "Operational backbone for home-care agencies: staffing, coordination, monitoring and family oversight." },
      { property: "og:title", content: "Home Care — Olia" },
      { property: "og:description", content: "Operational backbone for home-care agencies: staffing, coordination, monitoring and family oversight." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      crumbs={[{ label: "Solutions", to: "/solutions/home-care" }, { label: "Home Care" }]}
      title="The operating system for modern home-care agencies."
      lede="From rota to revenue — staffing intelligence, caregiver coordination and a family experience that drives retention."
      primaryCta={{ label: "Request a demo", to: "/contact" }}
      secondaryCta={{ label: "Open platform", to: "/app" }}
    >
      <Section kicker="Operational depth" title="Run the agency. Delight the family.">
        <FeatureGrid items={[
          { title: "Staffing & rota", body: "AI-assisted scheduling that respects continuity, geography and skills." },
          { title: "Caregiver coordination", body: "Real-time field operations, handover automation, GPS-verified visits." },
          { title: "Home monitoring", body: "Ambient sensors and wearables feeding a single resident dashboard." },
          { title: "Family oversight", body: "A premium family portal that becomes your strongest retention tool." },
          { title: "Billing & compliance", body: "Visit verification, payor exports and audit-ready records." },
          { title: "Outcomes analytics", body: "Falls, hospitalizations, satisfaction — measured and benchmarked." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
