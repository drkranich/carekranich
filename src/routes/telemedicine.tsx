import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/telemedicine")({
  head: () => ({
    meta: [
      { title: "Telemedicine — Olia" },
      { name: "description", content: "Virtual consultations, AI transcripts, scheduling and emergency telehealth across specialties." },
      { property: "og:title", content: "Telemedicine — Olia" },
      { property: "og:description", content: "Virtual consultations, AI transcripts, scheduling and emergency telehealth across specialties." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Care, anywhere"
      crumbs={[{ label: "Platform" }, { label: "Telemedicine" }]}
      title={<>A clinic visit,<span className="block italic text-olive"> from the living room sofa.</span></>}
      lede="Browser-native consultations, real-time transcription and a specialist network — designed for elder care."
      primaryCta={{ label: "Book a consultation", to: "/app" }}
      secondaryCta={{ label: "Talk to sales", to: "/contact" }}
    >
      <Section kicker="What's included" title="Telehealth that feels human.">
        <FeatureGrid items={[
          { title: "Virtual consultations", body: "Low-bandwidth video with large-text controls designed for older patients." },
          { title: "AI transcript", body: "Automatic SOAP notes, action items and patient-friendly summaries." },
          { title: "Smart scheduling", body: "Family-aware scheduling with travel-buffer and reminder workflows." },
          { title: "Emergency telehealth", body: "24/7 escalation lane with triage nurses and on-call physicians." },
          { title: "Specialist access", body: "Geriatricians, neurologists, cardiologists — curated for the longevity stage." },
          { title: "After-visit care", body: "Care plan updates, prescriptions and follow-ups synced to the family hub." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
