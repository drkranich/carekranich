import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/solutions/clinics")({
  head: () => ({
    meta: [
      { title: "Clinics — Olia" },
      { name: "description", content: "Outpatient and longevity clinics: operational analytics, scheduling, AI workflows and administration." },
      { property: "og:title", content: "Clinics — Olia" },
      { property: "og:description", content: "Outpatient and longevity clinics: operational analytics, scheduling, AI workflows and administration." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      crumbs={[{ label: "Solutions" }, { label: "Clinics" }]}
      title="Clinics that feel like a five-star hotel — and run like one."
      lede="Operational analytics, AI-native workflows and a patient experience that translates into reputation and revenue."
      primaryCta={{ label: "Talk to clinic team", to: "/contact" }}
      secondaryCta={{ label: "Open admin console", to: "/app" }}
    >
      <Section kicker="What changes" title="Operational excellence, end to end.">
        <FeatureGrid items={[
          { title: "Operational analytics", body: "Real-time utilization, no-shows, revenue and bottlenecks across rooms." },
          { title: "Scheduling", body: "Smart booking with intent routing, reminders and family coordination." },
          { title: "AI healthcare workflows", body: "Pre-visit summaries, intake intelligence, automated follow-ups." },
          { title: "Clinic administration", body: "Multi-location, multi-currency, role-based — enterprise from day one." },
          { title: "Patient experience", body: "A modern portal patients actually love using." },
          { title: "Outcomes & reporting", body: "Quality dashboards aligned to your accreditation framework." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
