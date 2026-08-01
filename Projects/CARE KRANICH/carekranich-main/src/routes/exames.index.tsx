import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MarketingPage } from "@/components/site/MarketingPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/exames/")({ component: ExamesPublic });

type PublicExam = {
  id: string;
  name: string;
  slug: string | null;
  commercial_name: string | null;
  category: string;
  subcategory: string | null;
  description: string | null;
  price_cents: number | null;
  turnaround_days: number | null;
  fasting_hours: number | null;
  home_collection: boolean | null;
};

const CATEGORIES = [
  { value: "all", label: "Todos" },
  { value: "laboratorial", label: "Laboratoriais" },
  { value: "imagem", label: "Imagem" },
  { value: "genetica", label: "Genéticos" },
];

function brl(cents: number | null) {
  if (cents === null || cents === undefined) return "Sob consulta";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ExamesPublic() {
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");

  const exams = useQuery({
    queryKey: ["public-exams"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select(
          "id,name,slug,commercial_name,category,subcategory,description,price_cents,turnaround_days,fasting_hours,home_collection",
        )
        .eq("active", true)
        .eq("is_public", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as PublicExam[];
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (exams.data ?? []).filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (!q) return true;
      return [e.name, e.commercial_name, e.subcategory, e.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [exams.data, category, query]);

  return (
    <MarketingPage
      eyebrow="Exames e diagnóstico"
      title={
        <>
          Encontre, compare e agende <span className="text-olive">seus exames</span>
        </>
      }
      lede="Exames laboratoriais, diagnóstico por imagem e testes genéticos com preparo claro, prazos transparentes e opção de coleta domiciliar."
      crumbs={[{ label: "Exames" }]}
      primaryCta={{ label: "Criar minha conta", to: "/signup" }}
      secondaryCta={{ label: "Já tenho conta", to: "/login" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`rounded-full px-4 py-2 text-sm transition ${
              category === c.value
                ? "bg-olive text-ivory shadow-soft"
                : "border border-border bg-ivory/60 text-muted-foreground backdrop-blur hover:bg-ivory"
            }`}
          >
            {c.label}
          </button>
        ))}
        <input
          className="ml-auto w-full max-w-xs rounded-full border border-border bg-ivory/60 px-5 py-2.5 text-sm backdrop-blur outline-none focus:border-olive/40"
          placeholder="Buscar exame..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {exams.isLoading && <p className="mt-10 text-sm text-muted-foreground">Carregando catálogo...</p>}

      {!exams.isLoading && filtered.length === 0 && (
        <p className="mt-10 text-sm text-muted-foreground">
          Nenhum exame encontrado. Ajuste a busca ou fale com a gente pelo chat.
        </p>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <Link
            key={e.id}
            to="/exames/$slug"
            params={{ slug: e.slug ?? e.id }}
            className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"
          >
            <span className="text-xs uppercase tracking-widest text-moss">
              {CATEGORIES.find((c) => c.value === e.category)?.label ?? e.category}
              {e.subcategory ? ` · ${e.subcategory}` : ""}
            </span>
            <h3 className="mt-2 font-display text-xl text-foreground">{e.commercial_name || e.name}</h3>
            {e.description && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{e.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {e.turnaround_days ? (
                <span className="rounded-full border border-border bg-ivory/60 px-2.5 py-1">Resultado em {e.turnaround_days}d</span>
              ) : null}
              {e.fasting_hours ? (
                <span className="rounded-full border border-border bg-ivory/60 px-2.5 py-1">Jejum {e.fasting_hours}h</span>
              ) : null}
              {e.home_collection ? (
                <span className="rounded-full border border-moss/30 bg-moss/10 px-2.5 py-1 text-moss">Coleta domiciliar</span>
              ) : null}
            </div>
            <div className="mt-auto flex items-center justify-between pt-5">
              <span className="font-display text-lg text-olive">{brl(e.price_cents)}</span>
              <span className="text-sm text-olive transition-transform group-hover:translate-x-0.5">Ver exame →</span>
            </div>
          </Link>
        ))}
      </div>
    </MarketingPage>
  );
}
