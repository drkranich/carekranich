import { createFileRoute } from "@tanstack/react-router";
import { FeatureGrid, MarketingPage, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/solutions")({
  head: () => ({
    meta: [
      { title: "Solutions - Care Kranich" },
      { name: "description", content: "Care Kranich solutions for home-care agencies, clinics, senior living, hospitals and insurers." },
      { property: "og:title", content: "Solutions - Care Kranich" },
      { property: "og:description", content: "Care Kranich solutions for operators, providers and partners across elder care." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Solutions"
      crumbs={[{ label: "Solutions" }]}
      title="One care platform, shaped for every operator."
      lede="Care Kranich adapts to the different organizations around an elder-care journey: family support, home care, clinics, communities, hospitals and payors."
      primaryCta={{ label: "Talk to sales", to: "/contact" }}
      secondaryCta={{ label: "See Family Center", to: "/family-center" }}
      related={[
        { label: "Home Care", to: "/solutions/home-care", description: "Scheduling, caregivers, billing and family oversight." },
        { label: "Clinics", to: "/solutions/clinics", description: "Operational analytics and AI-native workflows." },
        { label: "Senior Living", to: "/solutions/senior-living", description: "Resident operations across communities." },
        { label: "Hospitals", to: "/solutions/hospitals", description: "Post-acute coordination and interoperability." },
        { label: "Insurance", to: "/solutions/insurance", description: "Preventative analytics for payors." },
        { label: "Partners", to: "/partners", description: "Technology and services ecosystem." },
      ]}
    >
      <Section kicker="Choose a path" title="Start where your organization feels the pain.">
        <FeatureGrid
          items={[
            { title: "Home Care", body: "Run visits, handoffs, caregivers, family updates and compliance in one calm operating layer.", to: "/solutions/home-care", cta: "Open solution" },
            { title: "Clinics", body: "Give outpatient and longevity clinics a patient experience that feels premium and operates cleanly.", to: "/solutions/clinics", cta: "Open solution" },
            { title: "Senior Living", body: "Coordinate residents, staff, families, dining, activities and clinical oversight across communities.", to: "/solutions/senior-living", cta: "Open solution" },
            { title: "Hospitals", body: "Connect EHRs, discharge planning, post-acute care and risk prediction for older adults.", to: "/solutions/hospitals", cta: "Open solution" },
            { title: "Insurance", body: "Join care signals to claims data and prove preventative care outcomes before costs rise.", to: "/solutions/insurance", cta: "Open solution" },
            { title: "Partners", body: "Plug devices, clinical services and implementation teams into the Care Kranich ecosystem.", to: "/partners", cta: "Open partners" },
          ]}
        />
      </Section>
    </MarketingPage>
  );
}
