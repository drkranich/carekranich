import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/press")({
  head: () => ({
    meta: [
      { title: "Press â€” Care Kranich" },
      { name: "description", content: "Press kit, brand assets and announcements for journalists and media partners." },
      { property: "og:title", content: "Press â€” Care Kranich" },
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
      lede="Everything you need to write about Care Kranich â€” brand assets, leadership bios and the story behind the company."
      primaryCta={{ label: "Press contact", to: "/contact" }}
    >
      <Section kicker="Press kit" title="Download what you need.">
        <FeatureGrid items={[
          { title: "Logo pack", body: "SVG and PNG versions in olive, ivory and monochrome." },
          { title: "Brand guidelines", body: "Color, typography, voice and photography principles." },
          { title: "Product screenshots", body: "High-resolution captures of the Family, Caregiver and Clinical apps." },
          { title: "Leadership bios", body: "Founders, clinical advisors and executive team." },
          { title: "Fact sheet", body: "Company milestones, funding and key numbers." },
          { title: "Announcements", body: "Latest news, partnerships and product launches." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
