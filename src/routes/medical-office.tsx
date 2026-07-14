import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/medical-office")({
  head: () => ({
    meta: [
      { title: "Medical Office â€” Care Kranich" },
      { name: "description", content: "Physician dashboards, telemedicine, e-prescription and an AI clinical assistant for longitudinal elder care." },
      { property: "og:title", content: "Medical Office â€” Care Kranich" },
      { property: "og:description", content: "Physician dashboards, telemedicine, e-prescription and an AI clinical assistant for longitudinal elder care." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="For clinicians"
      crumbs={[{ label: "Platform" }, { label: "Medical Office" }]}
      title={<>Longitudinal medicine,<span className="block italic text-olive"> beautifully organized.</span></>}
      lede="A physician workspace built for continuity of care â€” with the intelligence to surface what matters before you ask."
      primaryCta={{ label: "Open clinician console", to: "/app" }}
      secondaryCta={{ label: "Talk to our medical team", to: "/contact" }}
    >
      <Section kicker="Capabilities" title="Clinical depth without the clutter.">
        <FeatureGrid items={[
          { title: "Physician dashboard", body: "Panels, risk scores and overdue follow-ups â€” auto-prioritized by acuity." },
          { title: "Telemedicine", body: "Browser-native video, AI transcript, structured SOAP notes." },
          { title: "E-prescription", body: "Country-aware prescription rails with adherence telemetry." },
          { title: "AI clinical assistant", body: "Summarize a chart, draft a referral, surface drug interactions." },
          { title: "Longitudinal analytics", body: "Multi-year trendlines for vitals, labs, function and cognition." },
          { title: "Healthcare intelligence", body: "Population dashboards across your panel â€” not just one patient." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
