import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/caregiver-app")({
  head: () => ({
    meta: [
      { title: "Caregiver App â€” Care Kranich" },
      { name: "description", content: "Tasks, medication, shifts, training and an AI assistant â€” built for caregivers in the field." },
      { property: "og:title", content: "Caregiver App â€” Care Kranich" },
      { property: "og:description", content: "Tasks, medication, shifts, training and an AI assistant â€” built for caregivers in the field." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="For caregivers"
      crumbs={[{ label: "Platform" }, { label: "Caregiver App" }]}
      title={<>A mobile workspace for the people<span className="block italic text-olive"> doing the real work.</span></>}
      lede="Plan a shift, log medication, check vitals, complete training â€” all in one elegant app designed with caregivers, not for them."
      primaryCta={{ label: "Start caregiver onboarding", to: "/signup" }}
      secondaryCta={{ label: "Open caregiver console", to: "/app" }}
    >
      <Section kicker="What's inside" title="Every shift, simpler.">
        <FeatureGrid items={[
          { title: "Task management", body: "Personalized daily plans synced with care plans and family preferences." },
          { title: "Medication logging", body: "Photo confirmation, barcode scan, missed-dose escalation." },
          { title: "Shift handover", body: "Beautiful end-of-shift summaries auto-drafted by AI." },
          { title: "Training & academy", body: "Micro-lessons, certifications and CEU tracking â€” built into the daily flow." },
          { title: "AI assistant", body: "Ask 'what's mom's blood pressure trend?' and get an answer in seconds." },
          { title: "Wellbeing for caregivers", body: "Burnout monitoring, peer support and gentle prompts to take a break." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
