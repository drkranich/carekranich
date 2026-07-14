import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/solutions/senior-living")({
  head: () => ({
    meta: [
      { title: "Senior Living - Care Kranich" },
      { name: "description", content: "Resident management, staffing intelligence and operational control for senior living communities." },
      { property: "og:title", content: "Senior Living - Care Kranich" },
      { property: "og:description", content: "Resident management, staffing intelligence and operational control for senior living communities." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      crumbs={[{ label: "Solutions", to: "/solutions" }, { label: "Senior Living" }]}
      title="A platform worthy of the homes you've built."
      lede="From independent living through memory care - one calm system for residents, families, staff and leadership."
      primaryCta={{ label: "Book a walkthrough", to: "/contact" }}
      secondaryCta={{ label: "See family experience", to: "/family-center" }}
    >
      <Section kicker="Built for scale" title="Designed for communities of 30 - and 3,000.">
        <FeatureGrid items={[
          { title: "Resident management", body: "Unified resident records spanning care, lifestyle, dining and engagement." },
          { title: "Staffing intelligence", body: "Acuity-based scheduling, agency cost reduction and overtime forecasting." },
          { title: "Operational control", body: "Maintenance, dining, transportation, housekeeping - one operational graph." },
          { title: "Family experience", body: "A family hub residents and adult children both rate 4.9/5." },
          { title: "Census & finance", body: "Move-in pipeline, ancillary revenue and payor mix in one view." },
          { title: "Wellbeing programs", body: "Track engagement, loneliness and purpose at the community level." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
