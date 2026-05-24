import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/family-center")({
  head: () => ({
    meta: [
      { title: "Family Center — Olia" },
      { name: "description", content: "Real-time monitoring, care timeline, alerts and a memory archive — one calm place for the people you love." },
      { property: "og:title", content: "Family Center — Olia" },
      { property: "og:description", content: "Real-time monitoring, care timeline, alerts and a memory archive — one calm place for the people you love." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="For families"
      crumbs={[{ label: "Platform" }, { label: "Family Center" }]}
      title={<>A calm window into the<span className="block italic text-olive"> people you love.</span></>}
      lede="See how mom slept, what she ate, when her medication was given — and feel the warmth of being present, even from far away."
      primaryCta={{ label: "Open Family Dashboard", to: "/app" }}
      secondaryCta={{ label: "Start a 14-day trial", to: "/signup" }}
    >
      <Section kicker="Inside the experience" title="Everything a family needs — nothing they don't.">
        <FeatureGrid items={[
          { title: "Real-time monitoring", body: "Vitals, sleep, mood and activity streamed live from sensors, wearables and caregiver check-ins." },
          { title: "Care timeline", body: "An elegant chronological record of every meal, walk, medication and conversation." },
          { title: "Smart alerts", body: "Quiet by default. Loud when it matters — falls, missed medication, unusual vitals." },
          { title: "Emotional wellbeing", body: "Mood journaling, loneliness signals and gentle interventions co-designed with geriatric psychologists." },
          { title: "Memory archive", body: "Photos, voice notes and stories preserved for the whole family — a living biography." },
          { title: "Family messaging", body: "Group threads, voice notes and care decisions, organized around the person — not the platform." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
