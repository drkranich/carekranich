import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Olia" },
      { name: "description", content: "Olia is the operating system for elderly care and longevity — built with dignity, designed for families." },
      { property: "og:title", content: "About — Olia" },
      { property: "og:description", content: "Olia is the operating system for elderly care and longevity — built with dignity, designed for families." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Our story"
      crumbs={[{ label: "Company" }, { label: "About" }]}
      title={<>The operating system for<span className="block italic text-olive"> elderly care & longevity.</span></>}
      lede="Olia exists because the people who cared for us deserve software as gentle, intelligent and dignified as the care they gave."
      primaryCta={{ label: "Join us", to: "/careers" }}
      secondaryCta={{ label: "Press kit", to: "/press" }}
    >
      <Section kicker="Why we exist" title="Care is the oldest form of love. It deserves a modern home.">
        <FeatureGrid items={[
          { title: "Mission", body: "Bring families, caregivers and clinicians into one calm space — built around the person, not the institution." },
          { title: "Vision", body: "A world where growing old is met with dignity, intelligence and beauty — at home, in clinics, in every community." },
          { title: "Values", body: "Warmth before features. Privacy before scale. Outcomes before opinions." },
          { title: "Longevity philosophy", body: "We measure success in good days at home, not in dashboards." },
          { title: "Built with care", body: "Co-designed with families, caregivers, nurses, physicians and the people we serve." },
          { title: "Global, local", body: "HIPAA, GDPR, LGPD — and the cultural fluency that makes care feel native, anywhere." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
