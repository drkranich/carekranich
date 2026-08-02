import { createFileRoute } from "@tanstack/react-router";
import { QuoteWorkspace } from "@/components/app/QuoteWorkspace";

export const Route = createFileRoute("/app/saas-quotes")({ component: SaasQuotes });

function SaasQuotes() {
  return (
    <QuoteWorkspace
      scope="platform"
      title="SaaS service quotes"
      subtitle="Super admin workspace for Care Kranich proposals, implementation services, subscriptions and custom commercial blocks."
      superOnly
    />
  );
}
