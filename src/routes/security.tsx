import { createFileRoute } from "@tanstack/react-router";
import { MarketingPage, FeatureGrid, Section } from "@/components/site/MarketingPage";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security - Care Kranich" },
      { name: "description", content: "Healthcare-grade security: encryption, RBAC, tenant isolation, audit logs and continuous monitoring." },
      { property: "og:title", content: "Security - Care Kranich" },
      { property: "og:description", content: "Healthcare-grade security: encryption, RBAC, tenant isolation, audit logs and continuous monitoring." },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <MarketingPage
      eyebrow="Trust"
      crumbs={[{ label: "Trust" }, { label: "Security" }]}
      title="Built like a bank. Felt like a home."
      lede="Healthcare data deserves more than checkboxes. Here's how Care Kranich protects it - by design and by default."
      primaryCta={{ label: "Request SOC 2 report", to: "/contact" }}
      secondaryCta={{ label: "Compliance overview", to: "/compliance" }}
    >
      <Section kicker="Controls" title="Defense in depth.">
        <FeatureGrid items={[
          { title: "Encryption", body: "AES-256 at rest, TLS 1.3 in transit, customer-managed keys for enterprise." },
          { title: "Role-based access", body: "Granular RBAC across family, caregiver, nurse, clinician and admin." },
          { title: "Tenant isolation", body: "Row-level security and per-tenant data partitioning enforced at the database." },
          { title: "Audit logs", body: "Immutable, append-only logs for every PHI access - exportable for auditors." },
          { title: "Authentication", body: "SSO (SAML, OIDC), MFA, device posture and session anomaly detection." },
          { title: "Continuous monitoring", body: "SIEM, secrets scanning, dependency monitoring and 24/7 on-call." },
        ]} />
      </Section>
    </MarketingPage>
  );
}
