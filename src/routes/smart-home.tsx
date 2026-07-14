import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/smart-home")({
  head: () => ({
    meta: [
      { title: "Smart Home â€” Care Kranich" },
      { name: "description", content: "Ambient sensors, fall detection and a calm home that quietly looks after the people in it." },
      { property: "og:title", content: "Smart Home â€” Care Kranich" },
      { property: "og:description", content: "Ambient sensors, fall detection and a calm home that quietly looks after the people in it." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Ambient guardianship"
      crumbs={[{ label: "Platform" }, { label: "Smart Home" }]}
      title={<>A home that watches over you<span className="block italic text-olive"> without watching you.</span></>}
      lede="Privacy-first ambient sensing, fall detection and gentle automations that turn any home into a guardian."
      primaryCta={{ label: "Explore the platform", to: "/app" }}
      secondaryCta={{ label: "Request a hardware kit", to: "/contact" }}
    >
      <Section kicker="The hardware ecosystem" title="Calm intelligence, woven into every room.">
        <FeatureGrid items={[
          { title: "Movement sensors", body: "Discreet motion and presence sensors learn daily rhythms and notice gentle drifts." },
          { title: "Fall detection", body: "Radar-based, camera-free fall detection with sub-second escalation." },
          { title: "Sleep & vitals", body: "Under-mattress and bedside sensors for breathing, heart rate and sleep quality." },
          { title: "Safety systems", body: "Stove timers, water leak, smoke and door sensors connected to one playbook." },
          { title: "Voice companion", body: "A gentle voice assistant for reminders, music and one-touch help." },
          { title: "Home guardianship", body: "If something is wrong, the right person knows â€” in the right way, at the right time." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
