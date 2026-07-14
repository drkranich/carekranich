import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/privacy-compliance")({
  head: () => ({
    meta: [
      { title: "GDPR & LGPD â€” Care Kranich" },
      { name: "description", content: "How Care Kranich complies with GDPR, LGPD and global privacy regulations â€” user rights, data handling and deletion requests." },
      { property: "og:title", content: "GDPR & LGPD â€” Care Kranich" },
      { property: "og:description", content: "How Care Kranich complies with GDPR, LGPD and global privacy regulations." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Trust"
      crumbs={[{ label: "Trust" }, { label: "GDPR & LGPD" }]}
      title="Privacy by design. Compliance by default."
      lede="Care Kranich is built to meet GDPR (EU), LGPD (Brazil), HIPAA (US) and emerging health-data regulations across the regions we serve."
      primaryCta={{ label: "Submit a data request", to: "/contact" }}
      secondaryCta={{ label: "Privacy policy", to: "/privacy" }}
    >
      <Section kicker="Your rights" title="What you can ask of us â€” and how to ask.">
        <FeatureGrid items={[
          { title: "GDPR", body: "Lawful basis, data minimization, regional EU storage and DPAs available on request." },
          { title: "LGPD", body: "Brazilian data residency, controller/processor mappings and ANPD-aligned controls." },
          { title: "Data handling", body: "Explicit purpose for every data point. No third-party advertising. Ever." },
          { title: "User rights", body: "Access, rectification, portability, restriction and objection â€” self-serve in-app." },
          { title: "Deletion requests", body: "Hard delete within 30 days, backup expiry within 90, certificate of deletion on request." },
          { title: "Sub-processors", body: "A published, kept-current list with notice for any material change." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
