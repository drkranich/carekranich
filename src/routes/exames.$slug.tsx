import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketingPage, Section } from "@/components/site/MarketingPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/exames/$slug")({ component: ExamDetail });

type PublicExam = {
  id: string;
  name: string;
  slug: string | null;
  commercial_name: string | null;
  technical_name: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  benefits: string | null;
  indication: string | null;
  contraindication: string | null;
  biological_material: string | null;
  collection_method: string | null;
  technology: string | null;
  genes_analyzed: string | null;
  preparation: string | null;
  fasting_hours: number | null;
  turnaround_days: number | null;
  price_cents: number | null;
  allow_installments: boolean | null;
  insurance_accepted: string | null;
  home_collection: boolean | null;
  requires_screening: boolean | null;
  requires_counseling: boolean | null;
  consent_required: boolean | null;
  sample_storage_policy: string | null;
  min_age: number | null;
  max_age: number | null;
  faq: Array<{ q: string; a: string }> | null;
  risks: string | null;
  limitations: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  laboratorial: "Laboratory exam",
  imagem: "Diagnostic imaging",
  genetica: "Genetic test",
};

function brl(cents: number | null) {
  if (cents === null || cents === undefined) return "On request";
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "BRL" });
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-widest text-moss">{label}</p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function ExamDetail() {
  const { slug } = Route.useParams();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const exam = useQuery({
    queryKey: ["public-exam", slug],
    queryFn: async () => {
      let q = (supabase as any)
        .from("exam_catalog")
        .select("*")
        .eq("active", true)
        .eq("is_public", true)
        .limit(1);
      // aceita slug ou id
      q = /^[0-9a-f]{8}-/.test(slug) ? q.eq("id", slug) : q.eq("slug", slug);
      const { data, error } = await q;
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as PublicExam | null;
    },
  });

  const related = useQuery({
    queryKey: ["public-exam-related", exam.data?.category, exam.data?.id],
    enabled: !!exam.data,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,slug,commercial_name,price_cents,category")
        .eq("active", true)
        .eq("is_public", true)
        .eq("category", exam.data!.category)
        .neq("id", exam.data!.id)
        .limit(3);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; name: string; slug: string | null; commercial_name: string | null; price_cents: number | null }>;
    },
  });

  if (exam.isLoading) {
    return (
      <MarketingPage title="Loading exam..." crumbs={[{ label: "Exams", to: "/exames" }]}>
        <p className="text-sm text-muted-foreground">Fetching exam information.</p>
      </MarketingPage>
    );
  }

  if (!exam.data) {
    return (
      <MarketingPage
        title="Exam not found"
        crumbs={[{ label: "Exames", to: "/exames" }]}
        primaryCta={{ label: "View full catalog", to: "/exames" }}
      >
        <p className="text-sm text-muted-foreground">
          This exam may have been removed from the public catalog. Explore the full catalog or contact us by chat.
        </p>
      </MarketingPage>
    );
  }

  const e = exam.data;
  const isGenetic = e.category === "genetica";

  return (
    <MarketingPage
      eyebrow={CATEGORY_LABEL[e.category] ?? "Exam"}
      title={e.commercial_name || e.name}
      lede={e.description ?? undefined}
      crumbs={[{ label: "Exames", to: "/exames" }, { label: e.commercial_name || e.name }]}
      primaryCta={{ label: "Schedule this exam", to: "/signup" }}
      secondaryCta={{ label: "Agendar para um familiar", to: "/signup" }}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <p className="text-xs uppercase tracking-widest text-moss">Investimento</p>
          <p className="mt-2 font-display text-3xl text-olive">{brl(e.price_cents)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {e.allow_installments ? "Installments available" : "Upfront payment"}
            {e.insurance_accepted ? ` · Insurance: ${e.insurance_accepted}` : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <p className="text-xs uppercase tracking-widest text-moss">Result turnaround</p>
          <p className="mt-2 font-display text-3xl text-foreground">
            {e.turnaround_days ? `${e.turnaround_days} dias` : "Consulte"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {e.home_collection ? "Home collection available" : "In-unit collection"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <p className="text-xs uppercase tracking-widest text-moss">Preparo</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {e.preparation || "No special preparation"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {e.fasting_hours ? `${e.fasting_hours}-hour fast` : "No fasting required"}
          </p>
        </div>
      </div>

      <Section title="About this exam" kicker="Clinical information">
        <div className="grid gap-4 md:grid-cols-2">
          {e.benefits && <InfoCard label="Benefits" value={e.benefits} />}
          {e.indication && <InfoCard label="Who it is recommended for" value={e.indication} />}
          {e.contraindication && <InfoCard label="Who it is not indicated for" value={e.contraindication} />}
          {e.biological_material && <InfoCard label="Material coletado" value={e.biological_material} />}
          {e.collection_method && <InfoCard label="Collection method" value={e.collection_method} />}
          {e.technology && <InfoCard label="Tecnologia utilizada" value={e.technology} />}
          {e.min_age || e.max_age ? (
            <InfoCard
              label="Age range"
              value={`${e.min_age ? `From ${e.min_age} years old` : "No minimum age"}${e.max_age ? ` · up to ${e.max_age} years old` : ""}`}
            />
          ) : null}
          {e.risks && <InfoCard label="Riscos" value={e.risks} />}
          {e.limitations && <InfoCard label="Limitations" value={e.limitations} />}
        </div>
      </Section>

      {isGenetic && (
        <Section title="Important genetic information" kicker="Responsible genetics">
          <div className="grid gap-4 md:grid-cols-2">
            {e.genes_analyzed && <InfoCard label="Genes analisados" value={e.genes_analyzed} />}
            {e.sample_storage_policy && (
              <InfoCard label="Armazenamento e descarte da amostra" value={e.sample_storage_policy} />
            )}
          </div>
          <div className="mt-4 rounded-2xl border border-terracotta/30 bg-terracotta/5 p-6 text-sm leading-relaxed text-muted-foreground">
            {e.consent_required && (
              <p>Este teste exige termo de consentimento assinado antes da coleta.</p>
            )}
            {e.requires_counseling && (
              <p className="mt-1">We recommend genetic counseling before and after the result.</p>
            )}
            <p className="mt-1">
              Genetic predisposition does not mean diagnosis. Results have restricted access, protected by explicit
              consent and an audit trail, and must be interpreted by qualified professionals.
            </p>
          </div>
        </Section>
      )}

      {e.requires_screening && (
        <div className="mt-10 rounded-2xl border border-border bg-ivory/60 p-6 text-sm text-muted-foreground backdrop-blur">
          This exam goes through a quick screening before scheduling to ensure your safety.
        </div>
      )}

      {Array.isArray(e.faq) && e.faq.length > 0 && (
        <Section title="Frequently asked questions" kicker="Clear answers">
          <div className="space-y-3">
            {e.faq.map((item, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="block w-full rounded-2xl border border-border bg-card p-5 text-left transition hover:shadow-soft"
              >
                <span className="flex items-center justify-between gap-3 font-display text-base text-foreground">
                  {item.q}
                  <span className="text-olive">{openFaq === i ? "−" : "+"}</span>
                </span>
                {openFaq === i && (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                )}
              </button>
            ))}
          </div>
        </Section>
      )}

      {(related.data ?? []).length > 0 && (
        <Section title="Related exams" kicker="You may also need">
          <div className="grid gap-4 md:grid-cols-3">
            {(related.data ?? []).map((r) => (
              <Link
                key={r.id}
                to="/exames/$slug"
                params={{ slug: r.slug ?? r.id }}
                className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <p className="font-display text-lg text-foreground">{r.commercial_name || r.name}</p>
                <p className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-olive">{brl(r.price_cents)}</span>
                  <span className="text-olive transition-transform group-hover:translate-x-0.5">Ver →</span>
                </p>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </MarketingPage>
  );
}
