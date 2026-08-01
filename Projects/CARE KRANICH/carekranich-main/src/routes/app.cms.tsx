import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Globe, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/cms")({ component: Cms });

type Section = {
  id: string;
  type: "texto" | "destaques" | "chamada" | "faq";
  title?: string;
  body?: string;
  items?: Array<{ title: string; body: string }>;
  cta_label?: string;
  cta_url?: string;
};

const SECTION_LABEL: Record<string, string> = {
  texto: "Bloco de texto",
  destaques: "Destaques (cards)",
  chamada: "Chamada com botão",
  faq: "Perguntas frequentes",
};

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function Cms() {
  const qc = useQueryClient();
  const { user, isSuperAdmin } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newPage, setNewPage] = useState({ title: "", slug: "" });
  const [draft, setDraft] = useState<{ title: string; subtitle: string; hero_eyebrow: string; sections: Section[] } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  if (!isSuperAdmin) return <Navigate to="/app" />;

  const pages = useQuery({
    queryKey: ["site-pages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("site_pages").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = useMemo(
    () => (pages.data ?? []).find((p: any) => p.id === selectedId) ?? (pages.data ?? [])[0] ?? null,
    [pages.data, selectedId],
  );

  const current = draft ?? (selected
    ? {
        title: selected.title ?? "",
        subtitle: selected.subtitle ?? "",
        hero_eyebrow: selected.hero_eyebrow ?? "",
        sections: (Array.isArray(selected.sections) ? selected.sections : []) as Section[],
      }
    : null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["site-pages"] });

  const createPage = useMutation({
    mutationFn: async () => {
      if (newPage.title.trim().length < 2) throw new Error("Informe o título da página.");
      const slug = newPage.slug.trim() || slugify(newPage.title);
      const { data, error } = await (supabase as any)
        .from("site_pages")
        .insert({ title: newPage.title.trim(), slug, updated_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Página criada");
      setNewPage({ title: "", slug: "" });
      setSelectedId(id);
      setDraft(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível criar a página"),
  });

  const savePage = useMutation({
    mutationFn: async () => {
      if (!selected || !current) return;
      const { error } = await (supabase as any)
        .from("site_pages")
        .update({
          title: current.title,
          subtitle: current.subtitle || null,
          hero_eyebrow: current.hero_eyebrow || null,
          sections: current.sections,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conteúdo salvo");
      setDraft(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = async () => {
    if (!selected) return;
    const { error } = await (supabase as any)
      .from("site_pages")
      .update({ published: !selected.published })
      .eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success(selected.published ? "Página despublicada" : "Página publicada");
    refresh();
  };

  const deletePage = async () => {
    if (!selected) return;
    if (!window.confirm(`Excluir a página "${selected.title}"?`)) return;
    const { error } = await (supabase as any).from("site_pages").delete().eq("id", selected.id);
    if (error) return toast.error(error.message);
    toast.success("Página excluída");
    setSelectedId(null);
    setDraft(null);
    refresh();
  };

  const patchSection = (id: string, partial: Partial<Section>) => {
    if (!current) return;
    setDraft({ ...current, sections: current.sections.map((s) => (s.id === id ? { ...s, ...partial } : s)) });
  };

  const addSection = (type: Section["type"]) => {
    if (!current) return;
    const base: Section = { id: uid(), type };
    if (type === "destaques" || type === "faq") base.items = [{ title: "", body: "" }];
    setDraft({ ...current, sections: [...current.sections, base] });
  };

  const removeSection = (id: string) => {
    if (!current) return;
    setDraft({ ...current, sections: current.sections.filter((s) => s.id !== id) });
  };

  const dropOn = (index: number) => {
    if (!current || dragIndex === null || dragIndex === index) return;
    const next = [...current.sections];
    const [item] = next.splice(dragIndex, 1);
    next.splice(index, 0, item);
    setDraft({ ...current, sections: next });
    setDragIndex(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS do site público"
        subtitle="Edite as páginas públicas por blocos — texto, destaques, chamadas e FAQ — sem mexer em código."
        action={
          selected && (
            <div className="flex flex-wrap gap-2">
              <a
                href={`/p/${selected.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs"
              >
                <Eye className="h-3.5 w-3.5" /> Ver no site
              </a>
              <button onClick={togglePublish} className={`rounded-full px-4 py-2 text-xs font-medium ${selected.published ? "border border-border bg-white/55" : "bg-moss text-ivory"}`}>
                {selected.published ? "Despublicar" : "Publicar"}
              </button>
              <button onClick={deletePage} className="inline-flex items-center gap-1 rounded-full border border-wine/30 bg-wine/5 px-3 py-2 text-xs text-wine">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          )
        }
      />

      <Card className="space-y-3 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4" /> Nova página pública
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <input className={glassInput} placeholder="Título (ex.: Sobre a Care Kranich)" value={newPage.title} onChange={(e) => setNewPage({ ...newPage, title: e.target.value })} />
          <input className={glassInput} placeholder="Endereço (opcional, ex.: sobre)" value={newPage.slug} onChange={(e) => setNewPage({ ...newPage, slug: e.target.value })} />
          <button onClick={() => createPage.mutate()} disabled={createPage.isPending} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-olive px-4 py-2.5 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60">
            <Plus className="h-4 w-4" /> Criar página
          </button>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">Páginas</h3>
          {(pages.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma página ainda.</p>}
          {(pages.data ?? []).map((p: any) => (
            <button
              key={p.id}
              onClick={() => {
                setSelectedId(p.id);
                setDraft(null);
              }}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === p.id ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                <Pill tone={p.published ? "moss" : "muted"}>{p.published ? "publicada" : "rascunho"}</Pill>
              </div>
              <p className="text-xs text-muted-foreground">/{p.slug}</p>
            </button>
          ))}
        </Card>

        {selected && current ? (
          <Card className="space-y-4 p-6">
            <div className="grid gap-3 md:grid-cols-3">
              <input className={glassInput} placeholder="Selo acima do título" value={current.hero_eyebrow} onChange={(e) => setDraft({ ...current, hero_eyebrow: e.target.value })} />
              <input className={`${glassInput} md:col-span-2`} placeholder="Título principal" value={current.title} onChange={(e) => setDraft({ ...current, title: e.target.value })} />
              <textarea className={`${glassInput} md:col-span-3`} rows={2} placeholder="Subtítulo / chamada de abertura" value={current.subtitle} onChange={(e) => setDraft({ ...current, subtitle: e.target.value })} />
            </div>

            <div className="flex flex-wrap gap-2">
              {(Object.keys(SECTION_LABEL) as Array<Section["type"]>).map((t) => (
                <button key={t} onClick={() => addSection(t)} className="rounded-full border border-border bg-white/55 px-3 py-1.5 text-xs hover:bg-cream">
                  + {SECTION_LABEL[t]}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {current.sections.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhum bloco ainda. Adicione blocos acima e arraste para reordenar.</p>
              )}
              {current.sections.map((s, index) => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dropOn(index)}
                  className={`space-y-2 rounded-2xl border p-4 transition ${
                    dragIndex === index ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex cursor-grab items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span aria-hidden>⠿</span> {SECTION_LABEL[s.type]}
                    </span>
                    <button onClick={() => removeSection(s.id)} className="rounded-full border border-wine/30 px-2 py-0.5 text-xs text-wine">
                      Remover
                    </button>
                  </div>

                  <input className={glassInput} placeholder="Título do bloco" value={s.title ?? ""} onChange={(e) => patchSection(s.id, { title: e.target.value })} />

                  {(s.type === "texto" || s.type === "chamada") && (
                    <textarea className={glassInput} rows={3} placeholder="Texto (cada linha vira um parágrafo)" value={s.body ?? ""} onChange={(e) => patchSection(s.id, { body: e.target.value })} />
                  )}

                  {s.type === "chamada" && (
                    <div className="grid gap-2 md:grid-cols-2">
                      <input className={glassInput} placeholder="Texto do botão" value={s.cta_label ?? ""} onChange={(e) => patchSection(s.id, { cta_label: e.target.value })} />
                      <input className={glassInput} placeholder="Link do botão (ex.: /signup)" value={s.cta_url ?? ""} onChange={(e) => patchSection(s.id, { cta_url: e.target.value })} />
                    </div>
                  )}

                  {(s.type === "destaques" || s.type === "faq") && (
                    <div className="space-y-2">
                      {(s.items ?? []).map((item, i) => (
                        <div key={i} className="grid gap-2 md:grid-cols-[1fr_2fr_auto]">
                          <input className={glassInput} placeholder={s.type === "faq" ? "Pergunta" : "Título do card"} value={item.title} onChange={(e) => patchSection(s.id, { items: (s.items ?? []).map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} />
                          <input className={glassInput} placeholder={s.type === "faq" ? "Resposta" : "Descrição"} value={item.body} onChange={(e) => patchSection(s.id, { items: (s.items ?? []).map((x, j) => (j === i ? { ...x, body: e.target.value } : x)) })} />
                          <button onClick={() => patchSection(s.id, { items: (s.items ?? []).filter((_, j) => j !== i) })} className="rounded-full border border-wine/30 px-3 text-xs text-wine">
                            ✕
                          </button>
                        </div>
                      ))}
                      <button onClick={() => patchSection(s.id, { items: [...(s.items ?? []), { title: "", body: "" }] })} className="rounded-full border border-border bg-white/55 px-3 py-1.5 text-xs">
                        + Adicionar item
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => savePage.mutate()} disabled={savePage.isPending || !draft} className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-50">
                {savePage.isPending ? "Salvando..." : draft ? "Salvar alterações" : "Sem alterações"}
              </button>
              {draft && (
                <button onClick={() => setDraft(null)} className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl">
                  Descartar
                </button>
              )}
            </div>
          </Card>
        ) : (
          <EmptyState title="Nenhuma página selecionada" hint="Crie a primeira página pública e monte o conteúdo por blocos." />
        )}
      </div>
    </div>
  );
}
