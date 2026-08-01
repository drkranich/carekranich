import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Copy, Dna, FileDown, Link2, MessageSquare, Plus, RotateCcw, Route as RouteIcon, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker } from "@/components/app/GlassDatePicker";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/ancestry-studio")({ component: AncestryStudio });

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  review: "Em revisão",
  approved: "Aprovado",
  published: "Publicado",
  archived: "Arquivado",
};

const CONFIDENCE = [
  { value: "alta", label: "Alta confiança" },
  { value: "moderada", label: "Confiança moderada" },
  { value: "ampla", label: "Estimativa ampla" },
  { value: "revisao", label: "Em revisão" },
];

const TEMPLATES = [
  { value: "classica", label: "Revelação Clássica" },
  { value: "cinematografica", label: "Jornada Cinematográfica" },
  { value: "atlas", label: "Atlas Científico" },
  { value: "familiar", label: "História Familiar" },
  { value: "minimalista", label: "Descoberta Minimalista" },
  { value: "luzes", label: "Mapa de Luzes" },
  { value: "migracoes", label: "Migrações Ancestrais" },
];

const SPEEDS = [
  { value: "lenta", label: "Ritmo contemplativo" },
  { value: "normal", label: "Ritmo equilibrado" },
  { value: "rapida", label: "Ritmo direto" },
];

const PALETTE = ["#c98a3a", "#7a9bd1", "#b5533f", "#5a6b46", "#8d6bb0", "#3f8f83", "#c2606a", "#95793f"];

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

const EMPTY_REGION = {
  continent: "",
  macro_region: "",
  genetic_region: "",
  country: "",
  sub_region: "",
  historical_territory: "",
  population_group: "",
  percentage: "",
  range_min: "",
  range_max: "",
  confidence: "moderada",
  color: PALETTE[0],
  latitude: "",
  longitude: "",
  summary: "",
  full_text: "",
  historical_text: "",
  limitations: "",
};

function AncestryStudio() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin, hasAnyRole } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const canUse = hasAnyRole(["doctor", "clinic_admin", "super_admin"]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newResult, setNewResult] = useState({ patient_id: "", exam_id: "", lab_name: "", algorithm_version: "", reference_population: "", processed_at: "" });
  const [openNew, setOpenNew] = useState(false);
  const [region, setRegion] = useState({ ...EMPTY_REGION });
  const [openRegion, setOpenRegion] = useState(false);
  const [comment, setComment] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [routeDraft, setRouteDraft] = useState({ label: "", from_lat: "", from_lng: "", to_lat: "", to_lng: "", period: "", description: "" });
  const [eventDraft, setEventDraft] = useState({ region_id: "", period: "", title: "", description: "" });
  const [shareDraft, setShareDraft] = useState({ recipient: "", days: "30", allow_download: true });
  if (!canUse) return <Navigate to="/app" />;

  const tenantsList = useQuery({
    queryKey: ["anc-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const patients = useQuery({
    queryKey: ["anc-patients", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("patients").select("id,full_name,social_name").order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const exams = useQuery({
    queryKey: ["anc-exams", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("id,name,commercial_name")
        .eq("category", "genetica")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const results = useQuery({
    queryKey: ["ancestry-results", tenantId, showArchived],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_results")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).filter((r: any) => (showArchived ? !!r.archived_at : !r.archived_at));
    },
  });

  const selected = (results.data ?? []).find((r: any) => r.id === selectedId) ?? (results.data ?? [])[0] ?? null;

  const regions = useQuery({
    queryKey: ["ancestry-regions", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_regions")
        .select("*")
        .eq("result_id", selected!.id)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const comments = useQuery({
    queryKey: ["ancestry-comments", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_comments")
        .select("*")
        .eq("result_id", selected!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const versions = useQuery({
    queryKey: ["ancestry-versions", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_result_versions")
        .select("id,version,reason,created_at")
        .eq("result_id", selected!.id)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const routesQ = useQuery({
    queryKey: ["ancestry-routes-studio", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_routes").select("*").eq("result_id", selected!.id).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const eventsQ = useQuery({
    queryKey: ["ancestry-events-studio", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_timeline_events").select("*").eq("result_id", selected!.id).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const sharesQ = useQuery({
    queryKey: ["ancestry-shares", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ancestry_shares").select("*").eq("result_id", selected!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const patientName = (id: string | null) => {
    const p = (patients.data ?? []).find((x: any) => x.id === id);
    return p ? p.social_name || p.full_name : "Paciente";
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ancestry-results", tenantId] });
    qc.invalidateQueries({ queryKey: ["ancestry-regions", selected?.id] });
    qc.invalidateQueries({ queryKey: ["ancestry-comments", selected?.id] });
    qc.invalidateQueries({ queryKey: ["ancestry-versions", selected?.id] });
    qc.invalidateQueries({ queryKey: ["ancestry-routes-studio", selected?.id] });
    qc.invalidateQueries({ queryKey: ["ancestry-events-studio", selected?.id] });
    qc.invalidateQueries({ queryKey: ["ancestry-shares", selected?.id] });
  };

  const audit = async (action: string, details?: string) => {
    if (!selected) return;
    await (supabase as any).from("ancestry_audit_log").insert({
      tenant_id: selected.tenant_id,
      result_id: selected.id,
      action,
      details: details ?? null,
      actor_id: user?.id ?? null,
    });
  };

  const totalPct = useMemo(
    () => (regions.data ?? []).reduce((a: number, r: any) => a + Number(r.percentage ?? 0), 0),
    [regions.data],
  );

  const issues = useMemo(() => {
    const list: string[] = [];
    const rs = regions.data ?? [];
    if (rs.length === 0) list.push("Nenhuma origem cadastrada.");
    if (totalPct > 100.5) list.push(`Soma dos percentuais acima de 100% (${totalPct.toFixed(1)}%).`);
    if (rs.length > 0 && totalPct < 95) list.push(`Soma dos percentuais abaixo de 95% (${totalPct.toFixed(1)}%).`);
    if (rs.some((r: any) => r.latitude === null || r.longitude === null)) list.push("Existe origem sem coordenadas no mapa.");
    if (rs.some((r: any) => !r.summary)) list.push("Existe origem sem descrição resumida.");
    return list;
  }, [regions.data, totalPct]);

  const createResult = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("Nenhuma organização disponível.");
      if (!newResult.patient_id) throw new Error("Selecione o paciente.");
      const { data, error } = await (supabase as any)
        .from("ancestry_results")
        .insert({
          tenant_id: effTenant,
          patient_id: newResult.patient_id,
          exam_id: newResult.exam_id || null,
          lab_name: newResult.lab_name.trim() || null,
          algorithm_version: newResult.algorithm_version.trim() || null,
          reference_population: newResult.reference_population.trim() || null,
          processed_at: newResult.processed_at || null,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Resultado criado como rascunho");
      setNewResult({ patient_id: "", exam_id: "", lab_name: "", algorithm_version: "", reference_population: "", processed_at: "" });
      setOpenNew(false);
      setSelectedId(id);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível criar"),
  });

  const addRegion = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Selecione um resultado.");
      const pct = Number(region.percentage.replace(",", "."));
      if (!pct || pct <= 0) throw new Error("Informe o percentual da origem.");
      if (!region.genetic_region && !region.country && !region.macro_region) {
        throw new Error("Informe ao menos a região genética, macrorregião ou país.");
      }
      const { error } = await (supabase as any).from("ancestry_regions").insert({
        tenant_id: selected.tenant_id,
        result_id: selected.id,
        continent: region.continent.trim() || null,
        macro_region: region.macro_region.trim() || null,
        genetic_region: region.genetic_region.trim() || null,
        country: region.country.trim() || null,
        sub_region: region.sub_region.trim() || null,
        historical_territory: region.historical_territory.trim() || null,
        population_group: region.population_group.trim() || null,
        percentage: pct,
        range_min: region.range_min ? Number(region.range_min.replace(",", ".")) : null,
        range_max: region.range_max ? Number(region.range_max.replace(",", ".")) : null,
        confidence: region.confidence,
        color: region.color,
        latitude: region.latitude ? Number(region.latitude.replace(",", ".")) : null,
        longitude: region.longitude ? Number(region.longitude.replace(",", ".")) : null,
        sort_order: (regions.data ?? []).length,
        summary: region.summary.trim() || null,
        full_text: region.full_text.trim() || null,
        historical_text: region.historical_text.trim() || null,
        limitations: region.limitations.trim() || null,
      });
      if (error) throw error;
      await audit("origem_adicionada", region.genetic_region || region.country || region.macro_region);
    },
    onSuccess: () => {
      toast.success("Origem adicionada");
      setRegion({ ...EMPTY_REGION, color: PALETTE[((regions.data ?? []).length + 1) % PALETTE.length] });
      setOpenRegion(false);
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const patchRegion = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await (supabase as any).from("ancestry_regions").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ancestry-regions", selected?.id] });
  };

  const removeRegion = async (id: string) => {
    if (!window.confirm("Remover esta origem do resultado?")) return;
    const { error } = await (supabase as any).from("ancestry_regions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await audit("origem_removida");
    refresh();
  };

  const reorder = async (index: number) => {
    if (dragIndex === null || dragIndex === index || !regions.data) return;
    const next = [...regions.data];
    const [item] = next.splice(dragIndex, 1);
    next.splice(index, 0, item);
    setDragIndex(null);
    for (let i = 0; i < next.length; i += 1) {
      await (supabase as any).from("ancestry_regions").update({ sort_order: i }).eq("id", next[i].id);
    }
    qc.invalidateQueries({ queryKey: ["ancestry-regions", selected?.id] });
  };

  const setStatus = async (status: string) => {
    if (!selected) return;
    const { error } = await (supabase as any)
      .from("ancestry_results")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    if (error) return toast.error(error.message);
    await audit("status", `Status alterado para ${STATUS_LABEL[status] ?? status}`);
    toast.success(`Status: ${STATUS_LABEL[status] ?? status}`);
    refresh();
  };

  const publish = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const { data, error } = await (supabase as any).rpc("publish_ancestry_result", {
        _result_id: selected.id,
        _reason: "Publicação pelo Estúdio",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Resultado publicado — o paciente já pode ver a experiência");
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Não foi possível publicar"),
  });

  const unpublish = async () => {
    if (!selected) return;
    const { error } = await (supabase as any)
      .from("ancestry_results")
      .update({ status: "approved", published_at: null })
      .eq("id", selected.id);
    if (error) return toast.error(error.message);
    await audit("despublicacao", "Resultado retirado do ar");
    toast.success("Resultado despublicado");
    refresh();
  };

  const archive = async (value: boolean) => {
    if (!selected) return;
    const { error } = await (supabase as any)
      .from("ancestry_results")
      .update({ archived_at: value ? new Date().toISOString() : null })
      .eq("id", selected.id);
    if (error) return toast.error(error.message);
    await audit(value ? "arquivamento" : "desarquivamento");
    toast.success(value ? "Resultado arquivado" : "Resultado restaurado");
    setSelectedId(null);
    refresh();
  };

  const softDelete = async () => {
    if (!selected) return;
    const reason = window.prompt("Motivo da exclusão (fica registrado na auditoria):");
    if (!reason) return;
    const { error } = await (supabase as any)
      .from("ancestry_results")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null, delete_reason: reason, status: "archived" })
      .eq("id", selected.id);
    if (error) return toast.error(error.message);
    await audit("exclusao", reason);
    toast.success("Resultado movido para a lixeira (recuperável)");
    setSelectedId(null);
    refresh();
  };

  const duplicate = async () => {
    if (!selected) return;
    const { data, error } = await (supabase as any)
      .from("ancestry_results")
      .insert({
        tenant_id: selected.tenant_id,
        patient_id: selected.patient_id,
        exam_id: selected.exam_id,
        title: `${selected.title} (cópia)`,
        lab_name: selected.lab_name,
        algorithm_version: selected.algorithm_version,
        reference_population: selected.reference_population,
        animation: selected.animation,
        created_by: user?.id ?? null,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    const rows = (regions.data ?? []).map((r: any) => ({
      tenant_id: selected.tenant_id,
      result_id: data.id,
      continent: r.continent, macro_region: r.macro_region, genetic_region: r.genetic_region,
      country: r.country, sub_region: r.sub_region, historical_territory: r.historical_territory,
      population_group: r.population_group, percentage: r.percentage, range_min: r.range_min, range_max: r.range_max,
      confidence: r.confidence, color: r.color, latitude: r.latitude, longitude: r.longitude,
      sort_order: r.sort_order, summary: r.summary, full_text: r.full_text, historical_text: r.historical_text,
      limitations: r.limitations,
    }));
    if (rows.length) await (supabase as any).from("ancestry_regions").insert(rows);
    toast.success("Resultado duplicado");
    setSelectedId(data.id);
    refresh();
  };

  const patchAnimation = async (patch: Record<string, unknown>) => {
    if (!selected) return;
    const next = { ...(selected.animation ?? {}), ...patch };
    const { error } = await (supabase as any).from("ancestry_results").update({ animation: next }).eq("id", selected.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ancestry-results", tenantId] });
  };

  const addComment = async () => {
    if (!selected || !comment.trim()) return;
    const { error } = await (supabase as any).from("ancestry_comments").insert({
      tenant_id: selected.tenant_id,
      result_id: selected.id,
      body: comment.trim(),
      author_id: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    setComment("");
    qc.invalidateQueries({ queryKey: ["ancestry-comments", selected.id] });
  };

  const addRoute = async () => {
    if (!selected) return;
    if (!routeDraft.label.trim()) return toast.error("Informe o nome da rota.");
    const { error } = await (supabase as any).from("ancestry_routes").insert({
      tenant_id: selected.tenant_id,
      result_id: selected.id,
      label: routeDraft.label.trim(),
      from_lat: routeDraft.from_lat ? Number(routeDraft.from_lat.replace(",", ".")) : null,
      from_lng: routeDraft.from_lng ? Number(routeDraft.from_lng.replace(",", ".")) : null,
      to_lat: routeDraft.to_lat ? Number(routeDraft.to_lat.replace(",", ".")) : null,
      to_lng: routeDraft.to_lng ? Number(routeDraft.to_lng.replace(",", ".")) : null,
      period: routeDraft.period.trim() || null,
      description: routeDraft.description.trim() || null,
      sort_order: (routesQ.data ?? []).length,
    });
    if (error) return toast.error(error.message);
    setRouteDraft({ label: "", from_lat: "", from_lng: "", to_lat: "", to_lng: "", period: "", description: "" });
    await audit("rota_adicionada", routeDraft.label.trim());
    refresh();
  };

  const removeRoute = async (id: string) => {
    const { error } = await (supabase as any).from("ancestry_routes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const addEvent = async () => {
    if (!selected) return;
    if (!eventDraft.period.trim() || !eventDraft.title.trim()) return toast.error("Informe período e título do marco.");
    const { error } = await (supabase as any).from("ancestry_timeline_events").insert({
      tenant_id: selected.tenant_id,
      result_id: selected.id,
      region_id: eventDraft.region_id || null,
      period: eventDraft.period.trim(),
      title: eventDraft.title.trim(),
      description: eventDraft.description.trim() || null,
      sort_order: (eventsQ.data ?? []).length,
    });
    if (error) return toast.error(error.message);
    setEventDraft({ region_id: "", period: "", title: "", description: "" });
    await audit("linha_tempo", eventDraft.title.trim());
    refresh();
  };

  const removeEvent = async (id: string) => {
    const { error } = await (supabase as any).from("ancestry_timeline_events").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const createShare = async () => {
    if (!selected) return;
    if (selected.status !== "published") return toast.error("Publique o resultado antes de compartilhar.");
    const token = `${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
    const days = Number(shareDraft.days) || 30;
    const { error } = await (supabase as any).from("ancestry_shares").insert({
      tenant_id: selected.tenant_id,
      result_id: selected.id,
      token,
      recipient: shareDraft.recipient.trim() || null,
      allow_download: shareDraft.allow_download,
      expires_at: new Date(Date.now() + days * 86400000).toISOString(),
      created_by: user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    await audit("compartilhamento", `Link criado para ${shareDraft.recipient || "destinatário não informado"} (${days} dias)`);
    toast.success("Link criado — copie e envie ao destinatário");
    setShareDraft({ recipient: "", days: "30", allow_download: true });
    refresh();
  };

  const revokeShare = async (id: string) => {
    const { error } = await (supabase as any).from("ancestry_shares").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    await audit("compartilhamento_revogado");
    toast.success("Link revogado");
    refresh();
  };

  const copyShare = async (token: string) => {
    const url = `${window.location.origin}/origens/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      window.prompt("Copie o link:", url);
    }
  };

  const exportPdf = () => {
    if (!selected) return;
    const rs = regions.data ?? [];
    downloadPdf(`ancestralidade-${patientName(selected.patient_id)}.pdf`, "Minhas Origens — relatório técnico", [
      `Paciente: ${patientName(selected.patient_id)}`,
      `Status: ${STATUS_LABEL[selected.status] ?? selected.status} · versão ${selected.version}`,
      `Laboratório: ${selected.lab_name ?? "-"}  Algoritmo: ${selected.algorithm_version ?? "-"}`,
      `População de referência: ${selected.reference_population ?? "-"}`,
      `Processado em: ${selected.processed_at ? new Date(selected.processed_at + "T00:00:00").toLocaleDateString("pt-BR") : "-"}`,
      "",
      `Composição (soma ${totalPct.toFixed(1)}%):`,
      ...rs.map(
        (r: any) =>
          `- ${[r.genetic_region, r.country, r.macro_region].filter(Boolean).join(" · ")}: ${Number(r.percentage).toFixed(1)}%${r.range_min ? ` (${r.range_min}–${r.range_max}%)` : ""} · ${CONFIDENCE.find((c) => c.value === r.confidence)?.label ?? r.confidence}`,
      ),
      "",
      "Estes percentuais representam estimativas construídas a partir da comparação entre o DNA do titular e grupos",
      "populacionais de referência. Semelhança genética com uma região não determina pertencimento cultural.",
    ]);
  };

  const stats = useMemo(() => {
    const all = results.data ?? [];
    return {
      drafts: all.filter((r: any) => r.status === "draft").length,
      review: all.filter((r: any) => r.status === "review").length,
      approved: all.filter((r: any) => r.status === "approved").length,
      published: all.filter((r: any) => r.status === "published").length,
    };
  }, [results.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estúdio de Resultados Ancestrais"
        subtitle="Construa a experiência Minhas Origens sem código: origens, percentuais validados, animação, revisão, versões e publicação."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs"
            >
              {showArchived ? "Ver ativos" : "Ver arquivados"}
            </button>
            <button
              onClick={() => setOpenNew(!openNew)}
              className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Novo resultado
            </button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Rascunhos" value={stats.drafts} sub="Em preenchimento" tone="gold" />
        <Stat label="Em revisão" value={stats.review} sub="Aguardando parecer" tone="olive" />
        <Stat label="Aprovados" value={stats.approved} sub="Prontos para publicar" tone="terracotta" />
        <Stat label="Publicados" value={stats.published} sub="Visíveis ao paciente" tone="moss" />
      </div>

      {openNew && (
        <Card className="space-y-3 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Dna className="h-4 w-4" /> Etapa 1 e 2 — paciente e exame
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <GlassSelect
              value={newResult.patient_id}
              onChange={(v) => setNewResult({ ...newResult, patient_id: v })}
              placeholder="Paciente *"
              options={(patients.data ?? []).map((p: any) => ({ value: p.id, label: p.social_name || p.full_name }))}
            />
            <GlassSelect
              value={newResult.exam_id}
              onChange={(v) => setNewResult({ ...newResult, exam_id: v })}
              placeholder="Teste genético"
              options={[{ value: "", label: "Sem exame vinculado" }, ...(exams.data ?? []).map((e: any) => ({ value: e.id, label: e.commercial_name || e.name }))]}
            />
            <input className={glassInput} placeholder="Laboratório responsável" value={newResult.lab_name} onChange={(e) => setNewResult({ ...newResult, lab_name: e.target.value })} />
            <input className={glassInput} placeholder="Versão do algoritmo (ex.: CK-Ancestry 2.1)" value={newResult.algorithm_version} onChange={(e) => setNewResult({ ...newResult, algorithm_version: e.target.value })} />
            <input className={glassInput} placeholder="População de referência" value={newResult.reference_population} onChange={(e) => setNewResult({ ...newResult, reference_population: e.target.value })} />
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">Data de processamento</p>
              <GlassDatePicker value={newResult.processed_at} onChange={(v) => setNewResult({ ...newResult, processed_at: v })} />
            </div>
          </div>
          <button onClick={() => createResult.mutate()} disabled={createResult.isPending} className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60">
            {createResult.isPending ? "Criando..." : "Criar rascunho"}
          </button>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">{showArchived ? "Arquivados" : "Resultados"}</h3>
          {(results.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum resultado nesta lista.</p>}
          {(results.data ?? []).map((r: any) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === r.id ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{patientName(r.patient_id)}</p>
                <Pill tone={r.status === "published" ? "moss" : r.status === "review" ? "gold" : "muted"}>
                  {STATUS_LABEL[r.status] ?? r.status}
                </Pill>
              </div>
              <p className="text-xs text-muted-foreground">
                v{r.version} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
              </p>
            </button>
          ))}
        </Card>

        {selected ? (
          <div className="space-y-6">
            <Card className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{patientName(selected.patient_id)}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selected.lab_name ?? "Laboratório não informado"} · {selected.algorithm_version ?? "algoritmo n/d"} ·{" "}
                    população {selected.reference_population ?? "n/d"} · versão {selected.version}
                  </p>
                </div>
                <Pill tone={selected.status === "published" ? "moss" : "gold"}>{STATUS_LABEL[selected.status]}</Pill>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {selected.status === "draft" && (
                  <button onClick={() => setStatus("review")} className="inline-flex items-center gap-1 rounded-full bg-olive px-4 py-2 font-medium text-ivory">
                    <Send className="h-3 w-3" /> Enviar para revisão
                  </button>
                )}
                {selected.status === "review" && (
                  <>
                    <button onClick={() => setStatus("approved")} className="rounded-full bg-moss px-4 py-2 font-medium text-ivory">
                      Aprovar
                    </button>
                    <button onClick={() => setStatus("draft")} className="rounded-full border border-border bg-white/55 px-4 py-2">
                      Solicitar correção
                    </button>
                  </>
                )}
                {selected.status === "approved" && (
                  <button onClick={() => publish.mutate()} disabled={publish.isPending} className="rounded-full bg-moss px-4 py-2 font-medium text-ivory disabled:opacity-60">
                    {publish.isPending ? "Publicando..." : "Publicar para o paciente"}
                  </button>
                )}
                {selected.status === "published" && (
                  <button onClick={unpublish} className="rounded-full border border-border bg-white/55 px-4 py-2">
                    Despublicar
                  </button>
                )}
                <button onClick={duplicate} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-4 py-2">
                  <Copy className="h-3 w-3" /> Duplicar
                </button>
                <button onClick={() => archive(!selected.archived_at)} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-4 py-2">
                  {selected.archived_at ? <RotateCcw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                  {selected.archived_at ? "Desarquivar" : "Arquivar"}
                </button>
                <button onClick={exportPdf} className="inline-flex items-center gap-1 rounded-full border border-border bg-white/55 px-4 py-2">
                  <FileDown className="h-3 w-3" /> Relatório técnico
                </button>
                <button onClick={softDelete} className="inline-flex items-center gap-1 rounded-full border border-wine/30 bg-wine/5 px-4 py-2 text-wine">
                  <Trash2 className="h-3 w-3" /> Excluir
                </button>
              </div>

              {issues.length > 0 && (
                <div className="rounded-2xl border border-terracotta/30 bg-terracotta/5 p-4 text-xs leading-5 text-terracotta">
                  <p className="font-semibold">Pendências antes de publicar:</p>
                  {issues.map((i, k) => (
                    <p key={k}>· {i}</p>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Etapa 3 — origens ({(regions.data ?? []).length}) · soma{" "}
                  <span className={totalPct > 100.5 || totalPct < 95 ? "text-wine" : "text-moss"}>{totalPct.toFixed(1)}%</span>
                </h3>
                <button onClick={() => setOpenRegion(!openRegion)} className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-xs font-medium text-ivory">
                  <Plus className="h-3.5 w-3.5" /> Adicionar origem
                </button>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-white/60">
                <div className={`h-full rounded-full ${totalPct > 100.5 ? "bg-wine" : totalPct >= 95 ? "bg-moss" : "bg-gold"}`} style={{ width: `${Math.min(100, totalPct)}%` }} />
              </div>

              {openRegion && (
                <div className="space-y-3 rounded-2xl border border-white/70 bg-white/45 p-4">
                  <div className="grid gap-2 md:grid-cols-4">
                    <input className={glassInput} placeholder="Continente" value={region.continent} onChange={(e) => setRegion({ ...region, continent: e.target.value })} />
                    <input className={glassInput} placeholder="Macrorregião (ex.: Europa Central)" value={region.macro_region} onChange={(e) => setRegion({ ...region, macro_region: e.target.value })} />
                    <input className={glassInput} placeholder="Região genética" value={region.genetic_region} onChange={(e) => setRegion({ ...region, genetic_region: e.target.value })} />
                    <input className={glassInput} placeholder="País atual" value={region.country} onChange={(e) => setRegion({ ...region, country: e.target.value })} />
                    <input className={glassInput} placeholder="Sub-região" value={region.sub_region} onChange={(e) => setRegion({ ...region, sub_region: e.target.value })} />
                    <input className={glassInput} placeholder="Território histórico (ex.: Pomerânia)" value={region.historical_territory} onChange={(e) => setRegion({ ...region, historical_territory: e.target.value })} />
                    <input className={glassInput} placeholder="Grupo populacional" value={region.population_group} onChange={(e) => setRegion({ ...region, population_group: e.target.value })} />
                    <GlassSelect value={region.confidence} onChange={(v) => setRegion({ ...region, confidence: v })} options={CONFIDENCE} />
                    <input className={glassInput} placeholder="Percentual * (ex.: 32,5)" inputMode="decimal" value={region.percentage} onChange={(e) => setRegion({ ...region, percentage: e.target.value })} />
                    <input className={glassInput} placeholder="Faixa mín. (%)" inputMode="decimal" value={region.range_min} onChange={(e) => setRegion({ ...region, range_min: e.target.value })} />
                    <input className={glassInput} placeholder="Faixa máx. (%)" inputMode="decimal" value={region.range_max} onChange={(e) => setRegion({ ...region, range_max: e.target.value })} />
                    <div className="flex flex-wrap items-center gap-1.5">
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => setRegion({ ...region, color: c })}
                          className={`h-7 w-7 rounded-full border-2 ${region.color === c ? "border-foreground" : "border-white/70"}`}
                          style={{ background: c }}
                          aria-label={`Cor ${c}`}
                        />
                      ))}
                    </div>
                    <input className={glassInput} placeholder="Latitude (ex.: 52.52)" inputMode="decimal" value={region.latitude} onChange={(e) => setRegion({ ...region, latitude: e.target.value })} />
                    <input className={glassInput} placeholder="Longitude (ex.: 13.40)" inputMode="decimal" value={region.longitude} onChange={(e) => setRegion({ ...region, longitude: e.target.value })} />
                  </div>
                  <input className={glassInput} placeholder="Descrição resumida (aparece no mapa)" value={region.summary} onChange={(e) => setRegion({ ...region, summary: e.target.value })} />
                  <textarea className={glassInput} rows={2} placeholder="Texto completo apresentado ao paciente" value={region.full_text} onChange={(e) => setRegion({ ...region, full_text: e.target.value })} />
                  <textarea className={glassInput} rows={2} placeholder="Contexto histórico e migrações" value={region.historical_text} onChange={(e) => setRegion({ ...region, historical_text: e.target.value })} />
                  <input className={glassInput} placeholder="Limitações desta estimativa" value={region.limitations} onChange={(e) => setRegion({ ...region, limitations: e.target.value })} />
                  <button onClick={() => addRegion.mutate()} disabled={addRegion.isPending} className="rounded-full bg-olive px-5 py-2 text-xs font-medium text-ivory disabled:opacity-60">
                    Adicionar origem
                  </button>
                </div>
              )}

              <div className="space-y-2">
                {(regions.data ?? []).map((r: any, index: number) => (
                  <div
                    key={r.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => reorder(index)}
                    className={`space-y-2 rounded-2xl border p-4 transition ${
                      dragIndex === index ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex cursor-grab items-center gap-2 text-sm font-medium text-foreground">
                        <span aria-hidden>⠿</span>
                        <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                        {[r.genetic_region, r.country, r.macro_region, r.continent].filter(Boolean)[0] ?? "Origem"}
                      </span>
                      <span className="flex items-center gap-2 text-xs">
                        <input
                          defaultValue={Number(r.percentage)}
                          onBlur={(e) => patchRegion(r.id, { percentage: Number(e.target.value.replace(",", ".")) || 0 })}
                          className="w-20 rounded-xl border border-border bg-ivory px-2 py-1 text-right"
                          inputMode="decimal"
                        />
                        <span className="text-muted-foreground">%</span>
                        <Pill tone={r.confidence === "alta" ? "moss" : r.confidence === "ampla" ? "gold" : "muted"}>
                          {CONFIDENCE.find((c) => c.value === r.confidence)?.label ?? r.confidence}
                        </Pill>
                        <button onClick={() => removeRegion(r.id)} className="rounded-full border border-wine/30 px-2 py-0.5 text-wine">
                          ✕
                        </button>
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {[r.sub_region, r.historical_territory, r.population_group].filter(Boolean).join(" · ") || "Sem detalhamento adicional"}
                      {r.latitude ? ` · ${Number(r.latitude).toFixed(2)}, ${Number(r.longitude).toFixed(2)}` : " · sem coordenadas"}
                    </p>
                    <input
                      defaultValue={r.summary ?? ""}
                      onBlur={(e) => patchRegion(r.id, { summary: e.target.value || null })}
                      placeholder="Descrição resumida (edição rápida)"
                      className="w-full rounded-xl border border-border bg-ivory px-3 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="space-y-3 p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <RouteIcon className="h-4 w-4" /> Rotas migratórias ({(routesQ.data ?? []).length})
                </h3>
                <div className="grid gap-2 md:grid-cols-2">
                  <input className={glassInput} placeholder="Nome da rota *" value={routeDraft.label} onChange={(e) => setRouteDraft({ ...routeDraft, label: e.target.value })} />
                  <input className={glassInput} placeholder="Período (ex.: séc. XVIII-XIX)" value={routeDraft.period} onChange={(e) => setRouteDraft({ ...routeDraft, period: e.target.value })} />
                  <input className={glassInput} placeholder="Origem — latitude" inputMode="decimal" value={routeDraft.from_lat} onChange={(e) => setRouteDraft({ ...routeDraft, from_lat: e.target.value })} />
                  <input className={glassInput} placeholder="Origem — longitude" inputMode="decimal" value={routeDraft.from_lng} onChange={(e) => setRouteDraft({ ...routeDraft, from_lng: e.target.value })} />
                  <input className={glassInput} placeholder="Destino — latitude" inputMode="decimal" value={routeDraft.to_lat} onChange={(e) => setRouteDraft({ ...routeDraft, to_lat: e.target.value })} />
                  <input className={glassInput} placeholder="Destino — longitude" inputMode="decimal" value={routeDraft.to_lng} onChange={(e) => setRouteDraft({ ...routeDraft, to_lng: e.target.value })} />
                </div>
                <input className={glassInput} placeholder="Descrição histórica da rota" value={routeDraft.description} onChange={(e) => setRouteDraft({ ...routeDraft, description: e.target.value })} />
                <button onClick={addRoute} className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory">
                  Adicionar rota
                </button>
                {(routesQ.data ?? []).map((r: any) => (
                  <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs">
                    <span className="text-foreground">{r.label}{r.period ? ` · ${r.period}` : ""}</span>
                    <button onClick={() => removeRoute(r.id)} className="text-wine">Remover</button>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  As rotas são referências populacionais e históricas, não a reconstrução exata da genealogia individual.
                </p>
              </Card>

              <Card className="space-y-3 p-6">
                <h3 className="text-sm font-semibold text-foreground">Linha do tempo ({(eventsQ.data ?? []).length})</h3>
                <GlassSelect
                  value={eventDraft.region_id}
                  onChange={(v) => setEventDraft({ ...eventDraft, region_id: v })}
                  placeholder="Vincular a uma origem (opcional)"
                  options={[{ value: "", label: "Sem origem específica" }, ...(regions.data ?? []).map((r: any) => ({
                    value: r.id,
                    label: [r.genetic_region, r.country, r.macro_region].filter(Boolean)[0] ?? "Origem",
                  }))]}
                />
                <div className="grid gap-2 md:grid-cols-2">
                  <input className={glassInput} placeholder="Período * (ex.: 1850-1890)" value={eventDraft.period} onChange={(e) => setEventDraft({ ...eventDraft, period: e.target.value })} />
                  <input className={glassInput} placeholder="Título do marco *" value={eventDraft.title} onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })} />
                </div>
                <input className={glassInput} placeholder="Descrição do marco histórico" value={eventDraft.description} onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })} />
                <button onClick={addEvent} className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory">
                  Adicionar marco
                </button>
                {(eventsQ.data ?? []).map((t: any) => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs">
                    <span className="text-foreground">{t.period} · {t.title}</span>
                    <button onClick={() => removeEvent(t.id)} className="text-wine">Remover</button>
                  </div>
                ))}
              </Card>

              <Card className="space-y-3 p-6 lg:col-span-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Link2 className="h-4 w-4" /> Compartilhamento seguro
                </h3>
                <div className="grid gap-2 md:grid-cols-4">
                  <input className={`${glassInput} md:col-span-2`} placeholder="Destinatário (nome ou e-mail)" value={shareDraft.recipient} onChange={(e) => setShareDraft({ ...shareDraft, recipient: e.target.value })} />
                  <input className={glassInput} placeholder="Validade em dias" inputMode="numeric" value={shareDraft.days} onChange={(e) => setShareDraft({ ...shareDraft, days: e.target.value })} />
                  <button
                    onClick={() => setShareDraft({ ...shareDraft, allow_download: !shareDraft.allow_download })}
                    className={`rounded-2xl border px-4 py-2.5 text-xs font-medium ${shareDraft.allow_download ? "border-olive bg-olive text-ivory" : "border-border bg-white/55"}`}
                  >
                    {shareDraft.allow_download ? "Download permitido" : "Sem download"}
                  </button>
                </div>
                <button onClick={createShare} className="rounded-full bg-olive px-5 py-2 text-xs font-medium text-ivory">
                  Gerar link temporário
                </button>
                {(sharesQ.data ?? []).map((sh: any) => (
                  <div key={sh.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs">
                    <span className="min-w-0 truncate text-foreground">
                      {sh.recipient ?? "Sem destinatário"} · {sh.access_count} acesso(s)
                      {sh.expires_at ? ` · expira ${new Date(sh.expires_at).toLocaleDateString("pt-BR")}` : ""}
                      {sh.revoked_at ? " · REVOGADO" : ""}
                    </span>
                    <span className="flex gap-2">
                      {!sh.revoked_at && (
                        <>
                          <button onClick={() => copyShare(sh.token)} className="rounded-full border border-border bg-white/55 px-3 py-1">
                            Copiar link
                          </button>
                          <button onClick={() => revokeShare(sh.id)} className="text-wine">Revogar</button>
                        </>
                      )}
                    </span>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  O link abre uma versão pública somente leitura do atlas, com expiração e revogação imediata.
                </p>
              </Card>

              <Card className="space-y-3 p-6">
                <h3 className="text-sm font-semibold text-foreground">Etapa 5 — animação da revelação</h3>
                <GlassSelect
                  value={(selected.animation?.template as string) ?? "classica"}
                  onChange={(v) => patchAnimation({ template: v })}
                  options={TEMPLATES}
                />
                <GlassSelect
                  value={(selected.animation?.speed as string) ?? "normal"}
                  onChange={(v) => patchAnimation({ speed: v })}
                  options={SPEEDS}
                />
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Zoom inicial do mapa
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    defaultValue={Number(selected.animation?.zoom ?? 1.6)}
                    onMouseUp={(e) => patchAnimation({ zoom: Number((e.target as HTMLInputElement).value) })}
                    className="flex-1 accent-[color:var(--olive)]"
                  />
                </label>
                <button
                  onClick={() => patchAnimation({ reduced_motion: !selected.animation?.reduced_motion })}
                  className={`rounded-full border px-4 py-1.5 text-xs font-medium ${
                    selected.animation?.reduced_motion ? "border-olive bg-olive text-ivory" : "border-border bg-white/55"
                  }`}
                >
                  {selected.animation?.reduced_motion ? "Modo acessível ativado" : "Ativar modo acessível (sem animação)"}
                </button>
              </Card>

              <Card className="space-y-3 p-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4" /> Comentários internos
                </h3>
                <p className="text-xs text-muted-foreground">Não visíveis ao paciente.</p>
                <div className="flex gap-2">
                  <input className={glassInput} placeholder="Ex.: revisar percentual da Europa Central" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <button onClick={addComment} className="rounded-full bg-olive px-4 py-2 text-xs font-medium text-ivory">
                    Comentar
                  </button>
                </div>
                {(comments.data ?? []).map((c: any) => (
                  <p key={c.id} className="rounded-xl border border-white/70 bg-white/45 px-3 py-2 text-xs text-muted-foreground">
                    {c.body} <span className="opacity-60">· {new Date(c.created_at).toLocaleString("pt-BR")}</span>
                  </p>
                ))}

                {(versions.data ?? []).length > 0 && (
                  <>
                    <h4 className="pt-2 text-sm font-semibold text-foreground">Versões publicadas</h4>
                    {(versions.data ?? []).map((v: any) => (
                      <p key={v.id} className="text-xs text-muted-foreground">
                        v{v.version} · {new Date(v.created_at).toLocaleString("pt-BR")} · {v.reason}
                      </p>
                    ))}
                  </>
                )}
              </Card>
            </div>
          </div>
        ) : (
          <EmptyState title="Nenhum resultado selecionado" hint="Crie um resultado ancestral para montar a experiência do paciente." />
        )}
      </div>
    </div>
  );
}
