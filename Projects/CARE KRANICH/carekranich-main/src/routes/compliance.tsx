import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance â€” Care Kranich" },
      { name: "description", content: "Healthcare governance, audit systems, role-based permissions and operational controls â€” built to satisfy your auditors." },
      { property: "og:title", content: "Compliance â€” Care Kranich" },
      { property: "og:description", content: "Healthcare governance, audit systems and operational controls â€” built to satisfy your auditors." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Trust"
      crumbs={[{ label: "Trust" }, { label: "Compliance" }]}
      title="Governance you can hand to your auditor."
      lede="From clinical SOPs to access reviews â€” Care Kranich ships with the operational scaffolding healthcare organizations actually need."
      primaryCta={{ label: "Talk to compliance team", to: "/contact" }}
      secondaryCta={{ label: "Security overview", to: "/security" }}
    >
      <Section kicker="Frameworks" title="Aligned with the standards that matter.">
        <FeatureGrid items={[
          { title: "SOC 2 Type II", body: "Annual independent attestation across security, availability and confidentiality." },
          { title: "HIPAA", body: "BAAs, technical safeguards and a Designated Privacy Officer on staff." },
          { title: "ISO 27001", body: "Information security management system aligned to ISO 27001:2022." },
          { title: "Audit systems", body: "Granular audit trails, evidence collection and quarterly access reviews." },
          { title: "Operational controls", body: "Change management, incident response, vendor risk and BCP/DR runbooks." },
          { title: "Future-ready", body: "EU AI Act, NIST AI RMF and emerging health-data residency rules tracked continuously." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
