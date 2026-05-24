import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/solutions/insurance")({
  head: () => ({
    meta: [
      { title: "Insurance — Olia" },
      { name: "description", content: "Claims integration, healthcare intelligence and preventative care analytics for insurers and payors." },
      { property: "og:title", content: "Insurance — Olia" },
      { property: "og:description", content: "Claims integration, healthcare intelligence and preventative care analytics for insurers and payors." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      crumbs={[{ label: "Solutions" }, { label: "Insurance" }]}
      title="Better outcomes lower costs. We help you prove it."
      lede="Connect Olia's care graph to your claims pipeline and watch readmissions, ER visits and long-stay placements bend."
      primaryCta={{ label: "Partner with us", to: "/partners" }}
      secondaryCta={{ label: "Talk to actuarial team", to: "/contact" }}
    >
      <Section kicker="What we deliver" title="A preventative-care moat for your members.">
        <FeatureGrid items={[
          { title: "Claims integration", body: "Real-time claims feeds joined to clinical and behavioral signals." },
          { title: "Healthcare intelligence", body: "Member-level risk stratification refreshed daily." },
          { title: "Preventative analytics", body: "Identify rising-risk members 12 months earlier." },
          { title: "Care concierge", body: "A premium member experience tied to your wellness incentives." },
          { title: "Outcomes contracts", body: "Value-based contract operations with audit-ready evidence." },
          { title: "Regulatory reporting", body: "Configurable reporting for HEDIS, CMS Stars and local payor schemes." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
