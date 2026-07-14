import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service - Care Kranich" },
      { name: "description", content: "The terms that govern your use of the Care Kranich platform." },
      { property: "og:title", content: "Terms of Service - Care Kranich" },
      { property: "og:description", content: "The terms that govern your use of the Care Kranich platform." },
    ],
  }),
  component: Page,
});

const sections = [
  { h: "1. Agreement", p: "By accessing the Care Kranich service you agree to these Terms and our Privacy Policy. If you are using Care Kranich on behalf of an organization, you confirm you have authority to bind that organization." },
  { h: "2. The service", p: "Care Kranich provides a multi-tenant healthcare coordination platform for families, caregivers, clinicians and operators. The service is provided on a subscription basis." },
  { h: "3. Accounts & access", p: "You are responsible for safeguarding credentials, configuring permissions and ensuring authorized use within your organization." },
  { h: "4. Acceptable use", p: "Don't misuse the service: no unlawful activity, no attempts to bypass security, no use that endangers patient safety." },
  { h: "5. Healthcare disclaimer", p: "Care Kranich is a coordination platform, not a substitute for professional medical advice, diagnosis or treatment. Always engage qualified clinicians." },
  { h: "6. Fees & billing", p: "Subscription fees are billed in advance. Enterprise terms are governed by signed order forms." },
  { h: "7. Data & confidentiality", p: "Customer data remains the customer's property. Care Kranich processes it as described in the Privacy Policy and applicable Data Processing Addendum." },
  { h: "8. Warranties & disclaimers", p: "The service is provided 'as is' except where expressly warranted in writing. Statutory warranties remain unaffected." },
  { h: "9. Limitation of liability", p: "To the maximum extent permitted by law, Care Kranich's aggregate liability is limited to fees paid in the 12 months preceding the claim." },
  { h: "10. Termination", p: "Either party may terminate for material breach with 30 days' notice. On termination, you may export data for 90 days before deletion." },
  { h: "11. Governing law", p: "These Terms are governed by the laws of the jurisdiction stated in your order form, or by default the laws of Portugal." },
  { h: "12. Contact", p: "carekranich@gmail.com" },
];

function Page() {
  return (
    <MarketingPage
      eyebrow="Legal"
      crumbs={[{ label: "Trust" }, { label: "Terms" }]}
      title="Terms of Service"
      lede="Last updated: May 24, 2026. Written to be readable - and enforceable."
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
