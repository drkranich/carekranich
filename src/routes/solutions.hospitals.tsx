import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/solutions/hospitals")({
  head: () => ({
    meta: [
      { title: "Hospitals — Olia" },
      { name: "description", content: "Interoperable elder-care infrastructure with an operational command center and predictive care models." },
      { property: "og:title", content: "Hospitals — Olia" },
      { property: "og:description", content: "Interoperable elder-care infrastructure with an operational command center and predictive care models." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      crumbs={[{ label: "Solutions" }, { label: "Hospitals" }]}
      title="Enterprise infrastructure for the longevity era."
      lede="From geriatric units to system-wide post-acute coordination — Olia plugs into the EHR you already run."
      primaryCta={{ label: "Talk to enterprise sales", to: "/contact" }}
      secondaryCta={{ label: "Review security", to: "/security" }}
    >
      <Section kicker="Hospital-grade" title="Interoperable. Operational. Predictive.">
        <FeatureGrid items={[
          { title: "Interoperability", body: "FHIR R4, HL7 v2, SMART-on-FHIR. Bidirectional with Epic, Cerner, Meditech." },
          { title: "Command center", body: "A live operations bridge for capacity, transfers and discharge." },
          { title: "Predictive healthcare", body: "Readmission risk, frailty progression, deterioration alerts." },
          { title: "Post-acute coordination", body: "Hand-off to home, SNF and outpatient — closed-loop." },
          { title: "Quality & compliance", body: "HEDIS, CMS Stars, Joint Commission — measured live." },
          { title: "Population health", body: "Stratification by acuity, social risk and care gaps." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
