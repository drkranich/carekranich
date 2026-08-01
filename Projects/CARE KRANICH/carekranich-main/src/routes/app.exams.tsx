import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassDateTimePicker } from "@/components/app/GlassDatePicker";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/exams")({ component: Exams });

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendado",
  collected: "Coletado",
  processing: "Em análise",
  ready: "Pronto",
  delivered: "Entregue",
  canceled: "Cancelado",
};

const STATUS_FLOW = ["scheduled", "collected", "processing", "ready", "delivered"];

const statusTone = (status: string) =>
  status === "ready" ? "moss" : status === "delivered" ? "olive" : status === "canceled" ? "wine" : "gold";

function money(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Exams() {
  const { profile, user, hasAnyRole, isSuperAdmin, displayName } = useAuth();
  const qc = useQueryClient();
  const isStaffClinic = hasAnyRole(["nurse", "doctor", "clinic_admin", "super_admin"]);
  const [newExam, setNewExam] = useState({ name: "", description: "", preparation: "", price: "", payment_link: "" });
  const [scheduling, setScheduling] = useState<any | null>(null);
  const [scheduleAt, setScheduleAt] = useState("");

  const catalog = useQuery({
    queryKey: ["exam-catalog", profile?.tenant_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_catalog")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["exam-orders", profile?.tenant_id, user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("exam_orders")
        .select("*, exam:exam_catalog(name, price_cents, payment_link)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createExam = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("exam_catalog").insert({
        tenant_id: profile?.tenant_id,
        name: newExam.name.trim(),
        description: newExam.description.trim() || null,
        preparation: newExam.preparation.trim() || null,
        price_cents: Math.round(Number(newExam.price || 0) * 100),
        payment_link: newExam.payment_link.trim() || null,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exame adicionado ao catálogo");
      setNewExam({ name: "", description: "", preparation: "", price: "", payment_link: "" });
      qc.invalidateQueries({ queryKey: ["exam-catalog", profile?.tenant_id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível salvar o exame"),
  });

  const scheduleExam = useMutation({
    mutationFn: async () => {
      if (!scheduling || !user) throw new Error("Sessão expirada");
      if (!scheduleAt) throw new Error("Escolha data e hora para a coleta.");
      const { error } = await (supabase as any).from("exam_orders").insert({
        tenant_id: scheduling.tenant_id ?? profile?.tenant_id,
        exam_id: scheduling.id,
        patient_id: user.id,
        patient_name: displayName || user.email,
        scheduled_for: new Date(scheduleAt).toISOString(),
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exame agendado");
      setScheduling(null);
      setScheduleAt("");
      qc.invalidateQueries({ queryKey: ["exam-orders", profile?.tenant_id, user?.id] });
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível agendar"),
  });

  const updateOrder = async (id: string, patch: Record<string, unknown>, message: string) => {
    const { error } = await (supabase as any).from("exam_orders").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(message);
      qc.invalidateQueries({ queryKey: ["exam-orders", profile?.tenant_id, user?.id] });
    }
  };

  const uploadResult = async (order: any, file: File) => {
    const path = `${order.tenant_id}/${order.patient_id}/${order.id}-${Date.now()}.pdf`;
    const { error } = await supabase.storage
      .from("exams")
      .upload(path, file, { contentType: file.type || "application/pdf", upsert: true });
    if (error) return toast.error(error.message);
    await updateOrder(order.id, { result_path: path, status: "ready" }, "Resultado anexado — exame pronto");
  };

  const openResult = async (order: any) => {
    if (!order.result_path) return toast.info("Resultado ainda não disponível.");
    const { data, error } = await supabase.storage.from("exams").createSignedUrl(order.result_path, 300);
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Não foi possível abrir o resultado");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    if (order.status === "ready") updateOrder(order.id, { status: "delivered" }, "Resultado entregue");
  };

  const nextStatus = (status: string) => STATUS_FLOW[STATUS_FLOW.indexOf(status) + 1];

  const myOrders = (orders.data ?? []).filter((order: any) => order.patient_id === user?.id);
  const tenantOrders = (orders.data ?? []);

  const exportOrdersPdf = () => {
    downloadPdf("relatorio-exames", "Relatório de Exames", [
      `Total de pedidos: ${tenantOrders.length}`,
      `Prontos: ${tenantOrders.filter((o: any) => o.status === "ready").length}`,
      `Pagos: ${tenantOrders.filter((o: any) => o.payment_status === "paid").length}`,
      "",
      ...tenantOrders.slice(0, 60).map((o: any) =>
        `${o.exam?.name ?? "Exame"} - ${o.patient_name ?? o.patient_id.slice(0, 8)} - ${STATUS_LABELS[o.status] ?? o.status} - pagamento ${o.payment_status === "paid" ? "pago" : "pendente"} - ${o.scheduled_for ? new Date(o.scheduled_for).toLocaleString("pt-BR") : "sem data"}`,
      ),
      "",
      `Gerado em ${new Date().toLocaleString("pt-BR")} - Care Kranich`,
    ]);
  };

  return (
    <>
      <PageHeader
        title="Clínica de exames"
        subtitle="Clientes consultam exames prontos, agendam coletas e realizam pagamentos. Resultados ficam em storage privado."
        action={
          <div className="flex items-center gap-2">
            <Pill tone="olive">Resultados assinados</Pill>
            {isStaffClinic && (
              <button onClick={exportOrdersPdf} className="rounded-full border border-moss/40 bg-white/60 px-4 py-2 text-xs font-medium hover:bg-moss/15">
                Relatório PDF
              </button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Catálogo" value={catalog.data?.length ?? "-"} sub="Exames ativos" tone="olive" />
        <Stat label="Agendados" value={tenantOrders.filter((o: any) => o.status === "scheduled").length} sub="Aguardando coleta" tone="gold" />
        <Stat label="Prontos" value={tenantOrders.filter((o: any) => o.status === "ready").length} sub="Resultado disponível" tone="moss" />
        <Stat label="Pagamentos pendentes" value={tenantOrders.filter((o: any) => o.payment_status === "pending").length} sub="A receber" tone="wine" />
      </div>

      {isStaffClinic && (
        <Card className="mt-6">
          <h2 className="text-xl font-semibold text-foreground">Novo exame no catálogo</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input value={newExam.name} onChange={(e) => setNewExam({ ...newExam, name: e.target.value })} placeholder="Nome do exame *" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-2" />
            <input value={newExam.price} onChange={(e) => setNewExam({ ...newExam, price: e.target.value })} placeholder="Preço (R$)" inputMode="decimal" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <input value={newExam.payment_link} onChange={(e) => setNewExam({ ...newExam, payment_link: e.target.value })} placeholder="Link de pagamento (Pix/Stripe)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <input value={newExam.description} onChange={(e) => setNewExam({ ...newExam, description: e.target.value })} placeholder="Descrição" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm md:col-span-2" />
            <input value={newExam.preparation} onChange={(e) => setNewExam({ ...newExam, preparation: e.target.value })} placeholder="Preparo (ex.: jejum de 8h)" className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm" />
            <button onClick={() => createExam.mutate()} disabled={!newExam.name.trim() || createExam.isPending} className="rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50">
              Salvar exame
            </button>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Catálogo de exames</h2>
        {(catalog.data ?? []).length === 0 ? (
          <div className="mt-4"><EmptyState title="Nenhum exame cadastrado" hint="A equipe da clínica pode cadastrar exames acima." /></div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(catalog.data ?? []).map((exam: any) => (
              <div key={exam.id} className="rounded-2xl border border-white/70 bg-white/50 p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{exam.name}</p>
                  <Pill tone="olive">{money(exam.price_cents)}</Pill>
                </div>
                {exam.description && <p className="mt-2 text-sm leading-5 text-muted-foreground">{exam.description}</p>}
                {exam.preparation && (
                  <p className="mt-2 rounded-xl bg-baby/20 px-3 py-2 text-xs leading-5 text-foreground/80">
                    Preparo: {exam.preparation}
                  </p>
                )}
                <button
                  onClick={() => { setScheduling(exam); setScheduleAt(""); }}
                  className="mt-3 w-full rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory hover:opacity-90"
                >
                  Agendar este exame
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {scheduling && (
        <Card className="mt-6 border-olive/30">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Agendar coleta</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">{scheduling.name} · {money(scheduling.price_cents)}</h3>
              <div className="mt-3">
                <GlassDateTimePicker value={scheduleAt} onChange={setScheduleAt} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setScheduling(null)} className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs">Cancelar</button>
              <button onClick={() => scheduleExam.mutate()} disabled={scheduleExam.isPending || !scheduleAt} className="rounded-full bg-olive px-5 py-2 text-xs font-semibold text-ivory disabled:opacity-45">
                {scheduleExam.isPending ? "Agendando..." : "Confirmar agendamento"}
              </button>
            </div>
          </div>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-xl font-semibold text-foreground">Meus exames</h2>
        {myOrders.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Você ainda não agendou exames.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {myOrders.map((order: any) => (
              <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/50 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{order.exam?.name ?? "Exame"}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.scheduled_for ? new Date(order.scheduled_for).toLocaleString("pt-BR") : "Sem data"} · pagamento {order.payment_status === "paid" ? "pago" : "pendente"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={statusTone(order.status)}>{STATUS_LABELS[order.status] ?? order.status}</Pill>
                  {order.payment_status !== "paid" && order.exam?.payment_link && (
                    <a href={order.exam.payment_link} target="_blank" rel="noopener noreferrer" className="rounded-full bg-gold/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:opacity-90">
                      Pagar
                    </a>
                  )}
                  {order.result_path && (
                    <button onClick={() => openResult(order)} className="rounded-full bg-moss px-3 py-1.5 text-xs font-semibold text-ivory">
                      Ver resultado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isStaffClinic && (
        <Card className="mt-6">
          <h2 className="text-xl font-semibold text-foreground">Gestão de pedidos (equipe)</h2>
          {tenantOrders.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido de exame ainda.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {tenantOrders.map((order: any) => (
                <div key={order.id} className="rounded-2xl border border-white/70 bg-white/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{order.exam?.name ?? "Exame"} · {order.patient_name ?? "Paciente"}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.scheduled_for ? new Date(order.scheduled_for).toLocaleString("pt-BR") : "Sem data"} · {money(order.exam?.price_cents ?? 0)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill tone={statusTone(order.status)}>{STATUS_LABELS[order.status] ?? order.status}</Pill>
                      <Pill tone={order.payment_status === "paid" ? "moss" : "gold"}>{order.payment_status === "paid" ? "pago" : "pendente"}</Pill>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {nextStatus(order.status) && order.status !== "canceled" && (
                      <button
                        onClick={() => updateOrder(order.id, { status: nextStatus(order.status) }, `Status: ${STATUS_LABELS[nextStatus(order.status)!]}`)}
                        className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory"
                      >
                        Avançar para {STATUS_LABELS[nextStatus(order.status)!]}
                      </button>
                    )}
                    {order.payment_status !== "paid" && (
                      <button
                        onClick={() => updateOrder(order.id, { payment_status: "paid", paid_at: new Date().toISOString() }, "Pagamento confirmado")}
                        className="rounded-full border border-moss/40 bg-white/55 px-3 py-1.5 text-xs"
                      >
                        Confirmar pagamento
                      </button>
                    )}
                    <label className="cursor-pointer rounded-full border border-olive/30 bg-white/55 px-3 py-1.5 text-xs text-olive">
                      {order.result_path ? "Substituir resultado" : "Anexar resultado (PDF)"}
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadResult(order, file);
                          event.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {order.result_path && (
                      <button onClick={() => openResult(order)} className="rounded-full border border-border bg-white/55 px-3 py-1.5 text-xs">
                        Abrir resultado
                      </button>
                    )}
                    {order.status !== "canceled" && (
                      <button
                        onClick={() => updateOrder(order.id, { status: "canceled" }, "Exame cancelado")}
                        className="rounded-full border border-wine/30 px-3 py-1.5 text-xs text-wine"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </>
  );
}
