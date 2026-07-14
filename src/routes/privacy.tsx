import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy - Care Kranich" },
      { name: "description", content: "How Care Kranich collects, uses, stores and protects personal and health information." },
      { property: "og:title", content: "Privacy Policy - Care Kranich" },
      { property: "og:description", content: "How Care Kranich collects, uses, stores and protects personal and health information." },
    ],
  }),
  component: Page,
});

const sections = [
  { h: "1. Who we are", p: "Care Kranich operates the Care Kranich platform - a healthcare technology service for families, caregivers, clinics and senior-living communities." },
  { h: "2. Information we collect", p: "Account data, profile data, care data, device telemetry from connected wearables and sensors, and usage telemetry needed to operate the service." },
  { h: "3. How we use information", p: "Solely to deliver, secure and improve the service. We do not sell personal data, and we do not use protected health information for advertising - ever." },
  { h: "4. Legal bases", p: "Performance of contract, legitimate interest, consent (where required) and compliance with legal obligations including HIPAA, GDPR and LGPD." },
  { h: "5. Sharing & sub-processors", p: "We share data only with vetted sub-processors under DPAs, and with parties you explicitly authorize (clinicians, family members, agency staff)." },
  { h: "6. Retention", p: "We retain data for the duration of your relationship with Care Kranich, plus the minimum period required by applicable healthcare law." },
  { h: "7. Your rights", p: "Access, correction, deletion, portability, restriction and objection - exercised in-app or via carekranich@gmail.com." },
  { h: "8. Security", p: "Encryption in transit and at rest, RBAC, audit logging, continuous monitoring and a documented incident response process." },
  { h: "9. International transfers", p: "Regional data residency available. Where transfers occur, Standard Contractual Clauses and supplementary measures are in place." },
  { h: "10. Changes to this policy", p: "We notify users of material changes by email and in-app at least 30 days before they take effect." },
  { h: "11. Contact", p: "Data Protection Officer - carekranich@gmail.com." },
];

function Page() {
  return (
    <MarketingPage
      eyebrow="Legal"
      crumbs={[{ label: "Trust" }, { label: "Privacy" }]}
      title="Privacy Policy"
      lede="Last updated: May 24, 2026. We've kept this short, honest and readable."
    >
      <article className="space-y-8">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold text-olive">{s.h}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{s.p}</p>
          </section>
        ))}
      </article>
    </MarketingPage>
  );
}
