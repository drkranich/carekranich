import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: "Press - Care Kranich" },
      { name: "description", content: "Press kit, brand assets and announcements for journalists and media partners." },
      { property: "og:title", content: "Press - Care Kranich" },
      { property: "og:description", content: "Press kit, brand assets and announcements for journalists and media partners." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Press"
      crumbs={[{ label: "Company" }, { label: "Press" }]}
      title="For journalists, partners and the curious."
      lede="Everything you need to write about Care Kranich - brand assets, leadership bios and the story behind the company."
      primaryCta={{ label: "Press contact", to: "/contact" }}
    >
      <Section kicker="Press kit" title="Request the material you need.">
        <FeatureGrid items={[
          { title: "Logo pack", body: "SVG and PNG versions in olive, ivory and monochrome.", to: "/contact", cta: "Request asset" },
          { title: "Brand guidelines", body: "Color, typography, voice and photography principles.", to: "/contact", cta: "Request guide" },
          { title: "Product screenshots", body: "High-resolution captures of the Family, Caregiver and Clinical apps.", to: "/contact", cta: "Request screenshots" },
          { title: "Leadership bios", body: "Founders, clinical advisors and executive team.", to: "/contact", cta: "Request bios" },
          { title: "Fact sheet", body: "Company milestones, funding and key numbers.", to: "/contact", cta: "Request sheet" },
          { title: "Announcements", body: "Latest news, partnerships and product launches.", to: "/contact", cta: "Contact press" },
        ]} />
      </Section>
    </MarketingPage>
  );
}
