import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Partners - Care Kranich" },
      { name: "description", content: "Clinics, insurers, home-care companies, healthcare providers and technology integrators in the Care Kranich ecosystem." },
      { property: "og:title", content: "Partners - Care Kranich" },
      { property: "og:description", content: "Clinics, insurers, home-care companies, healthcare providers and technology integrators in the Care Kranich ecosystem." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Ecosystem"
      crumbs={[{ label: "Company" }, { label: "Partners" }]}
      title="Better care is a team sport."
      lede="Care Kranich connects the clinics, insurers, home-care operators and technology platforms that touch a longevity journey."
      primaryCta={{ label: "Become a partner", to: "/contact" }}
      secondaryCta={{ label: "Partner login", to: "/login" }}
    >
      <Section kicker="Partner types" title="Where you fit in.">
        <FeatureGrid items={[
          { title: "Clinics & physicians", body: "Embed Care Kranich into your patient journey and grow long-term relationships." },
          { title: "Insurers & payors", body: "Reduce avoidable utilization with preventative, member-loved care." },
          { title: "Home-care companies", body: "Run beautifully - and use Care Kranich as your strongest retention tool." },
          { title: "Healthcare providers", body: "Hospitals, SNFs and senior living connected through one care graph." },
          { title: "Technology integrations", body: "Wearables, IoT, EHRs and pharmacy networks - published APIs." },
          { title: "Implementation partners", body: "Certified consultancies for large-scale rollouts." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
