import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, FileDown, Plus, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { GlassDatePicker } from "@/components/app/GlassDatePicker";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/companies")({ component: Companies });

const EXAM_TYPES = [
  { value: "admissional", label: "Admissional" },
  { value: "periodico", label: "Periodic" },
  { value: "demissional", label: "Demissional" },
  { value: "retorno", label: "Return to work" },
  { value: "mudanca_funcao", label: "Role change" },
  { value: "toxicologico", label: "Toxicology" },
  { value: "checkup", label: "Check-up" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  scheduled: "Scheduled",
  done: "Completed",
  absent: "No-show",
};

const glassInput =
  "w-full rounded-2xl border border-white/70 bg-white/55 px-4 py-2.5 text-sm shadow-soft backdrop-blur-xl outline-none focus:border-olive/40";

function Companies() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const tenantId = profile?.tenant_id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openCompany, setOpenCompany] = useState(false);
  const [company, setCompany] = useState({ name: "", cnpj: "", contact_name: "", email: "", phone: "", cost_center: "" });
  const [employee, setEmployee] = useState({ full_name: "", cpf: "", role_title: "", branch: "", exam_type: "admissional", scheduled_for: "" });
  const [bulk, setBulk] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const tenantsList = useQuery({
    queryKey: ["co-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = tenantId ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const companies = useQuery({
    queryKey: ["companies", tenantId],
    enabled: !!tenantId || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("companies").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = (companies.data ?? []).find((c: any) => c.id === selectedId) ?? (companies.data ?? [])[0] ?? null;

  const employees = useQuery({
    queryKey: ["company-employees", selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("company_employees")
        .select("*")
        .eq("company_id", selected!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["companies", tenantId] });
    qc.invalidateQueries({ queryKey: ["company-employees", selected?.id] });
  };

  const saveCompany = useMutation({
    mutationFn: async () => {
      if (!effTenant) throw new Error("No organization available.");
      if (company.name.trim().length < 2) throw new Error("Enter the company name.");
      const { data, error } = await (supabase as any)
        .from("companies")
        .insert({
          tenant_id: effTenant,
          name: company.name.trim(),
          cnpj: company.cnpj.trim() || null,
          contact_name: company.contact_name.trim() || null,
          email: company.email.trim() || null,
          phone: company.phone.trim() || null,
          cost_center: company.cost_center.trim() || null,
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Company registered");
      setCompany({ name: "", cnpj: "", contact_name: "", email: "", phone: "", cost_center: "" });
      setOpenCompany(false);
      setSelectedId(id);
      refresh();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const addEmployee = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select the company.");
      if (employee.full_name.trim().length < 3) throw new Error("Enter the employee name.");
      const { error } = await (supabase as any).from("company_employees").insert({
        tenant_id: selected.tenant_id,
        company_id: selected.id,
        full_name: employee.full_name.trim(),
        cpf: employee.cpf.trim() || null,
        role_title: employee.role_title.trim() || null,
        branch: employee.branch.trim() || null,
        exam_type: employee.exam_type,
        scheduled_for: employee.scheduled_for || null,
        status: employee.scheduled_for ? "scheduled" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Employee added");
      setEmployee({ full_name: "", cpf: "", role_title: "", branch: "", exam_type: "admissional", scheduled_for: "" });
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const importBulk = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select the company.");
      const lines = bulk.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) throw new Error("Paste at least one line.");
      const rows = lines.map((line) => {
        const [full_name, cpf, role_title, exam_type] = line.split(/[;,\t]/).map((x) => (x ?? "").trim());
        return {
          tenant_id: selected.tenant_id,
          company_id: selected.id,
          full_name: full_name || "Unnamed",
          cpf: cpf || null,
          role_title: role_title || null,
          exam_type: EXAM_TYPES.some((t) => t.value === exam_type) ? exam_type : "periodico",
          status: "pending",
        };
      });
      const { error } = await (supabase as any).from("company_employees").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`${n} employee(s) imported`);
      setBulk("");
      setBulkOpen(false);
      refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setStatus = async (row: any, status: string) => {
    const { error } = await (supabase as any).from("company_employees").update({ status }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success(`Status: ${STATUS_LABEL[status]}`);
    refresh();
  };

  const removeEmployee = async (row: any) => {
    if (!window.confirm(`Remove ${row.full_name} from the campaign?`)) return;
    const { error } = await (supabase as any).from("company_employees").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const exportPdf = () => {
    if (!selected) return;
    const list = employees.data ?? [];
    downloadPdf(`occupational-${selected.name}.pdf`, `Occupational health - ${selected.name}`, [
      `Tax ID: ${selected.cnpj ?? "-"}  Cost center: ${selected.cost_center ?? "-"}`,
      `Contact: ${selected.contact_name ?? "-"} - ${selected.email ?? "-"} - ${selected.phone ?? "-"}`,
      `Issued on: ${new Date().toLocaleString("en-US")}`,
      "",
      `Employees: ${list.length}`,
      ...list.map(
        (e: any) =>
          `- ${e.full_name}${e.cpf ? ` (${e.cpf})` : ""} - ${EXAM_TYPES.find((t) => t.value === e.exam_type)?.label ?? e.exam_type} - ${STATUS_LABEL[e.status] ?? e.status}${e.scheduled_for ? ` - ${new Date(e.scheduled_for + "T00:00:00").toLocaleDateString("en-US")}` : ""}`,
      ),
    ]);
  };

  const stats = useMemo(() => {
    const list = employees.data ?? [];
    return {
      total: list.length,
      pending: list.filter((e: any) => e.status === "pending").length,
      scheduled: list.filter((e: any) => e.status === "scheduled").length,
      done: list.filter((e: any) => e.status === "done").length,
    };
  }, [employees.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company portal"
        subtitle="Occupational health: corporate contracts, employees, exam campaigns, and cost-center billing."
        action={
          <button
            onClick={() => setOpenCompany(!openCompany)}
            className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New company
          </button>
        }
      />

      {openCompany && (
        <Card className="space-y-3 p-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Briefcase className="h-4 w-4" /> New contracting company
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input className={glassInput} placeholder="Legal name / trade name *" value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} />
            <input className={glassInput} placeholder="CNPJ" value={company.cnpj} onChange={(e) => setCompany({ ...company, cnpj: e.target.value })} />
            <input className={glassInput} placeholder="Cost center" value={company.cost_center} onChange={(e) => setCompany({ ...company, cost_center: e.target.value })} />
            <input className={glassInput} placeholder="Responsible contact" value={company.contact_name} onChange={(e) => setCompany({ ...company, contact_name: e.target.value })} />
            <input className={glassInput} placeholder="E-mail" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
            <input className={glassInput} placeholder="Phone" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveCompany.mutate()} disabled={saveCompany.isPending} className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60">
              {saveCompany.isPending ? "Saving..." : "Register company"}
            </button>
            <button onClick={() => setOpenCompany(false)} className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm backdrop-blur-xl">
              Cancel
            </button>
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="space-y-2 p-5">
          <h3 className="text-sm font-semibold text-foreground">Companies</h3>
          {(companies.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No companies yet.</p>}
          {(companies.data ?? []).map((c: any) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`block w-full rounded-2xl border px-4 py-3 text-left transition ${
                selected?.id === c.id ? "border-olive/60 bg-olive/10" : "border-white/70 bg-white/50 hover:bg-white/75"
              }`}
            >
              <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.cnpj ?? "no tax ID"}{c.cost_center ? ` - ${c.cost_center}` : ""}</p>
            </button>
          ))}
        </Card>

        {selected ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <Stat label="Employees" value={stats.total} sub="In campaign" tone="olive" />
              <Stat label="Pending" value={stats.pending} sub="Not scheduled" tone="gold" />
              <Stat label="Scheduled" value={stats.scheduled} sub="With date" tone="moss" />
              <Stat label="Completed" value={stats.done} sub="Completed exams" tone="wine" />
            </div>

            <Card className="space-y-3 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Users className="h-4 w-4" /> {selected.name}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setBulkOpen(!bulkOpen)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                    <Upload className="h-3.5 w-3.5" /> Import list
                  </button>
                  <button onClick={exportPdf} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/55 px-4 py-2 text-xs">
                    <FileDown className="h-3.5 w-3.5" /> PDF report
                  </button>
                </div>
              </div>

              {bulkOpen && (
                <div className="space-y-2 rounded-2xl border border-white/70 bg-white/45 p-4">
                  <p className="text-xs text-muted-foreground">
                    Paste one line per employee: <strong>name; tax ID; role; type</strong> (types: admissional, periodico, demissional, retorno, mudanca_funcao, toxicologico, checkup).
                  </p>
                  <textarea
                    value={bulk}
                    onChange={(e) => setBulk(e.target.value)}
                    rows={5}
                    placeholder={"Maria Souza; 000.000.000-00; Assistant; periodico\nJohn Lima; ; Driver; toxicologico"}
                    className={glassInput}
                  />
                  <button onClick={() => importBulk.mutate()} disabled={importBulk.isPending} className="rounded-full bg-olive px-4 py-1.5 text-xs font-medium text-ivory disabled:opacity-60">
                    Import
                  </button>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <input className={glassInput} placeholder="Employee name *" value={employee.full_name} onChange={(e) => setEmployee({ ...employee, full_name: e.target.value })} />
                <input className={glassInput} placeholder="CPF" value={employee.cpf} onChange={(e) => setEmployee({ ...employee, cpf: e.target.value })} />
                <input className={glassInput} placeholder="Role" value={employee.role_title} onChange={(e) => setEmployee({ ...employee, role_title: e.target.value })} />
                <input className={glassInput} placeholder="Branch" value={employee.branch} onChange={(e) => setEmployee({ ...employee, branch: e.target.value })} />
                <GlassSelect value={employee.exam_type} onChange={(v) => setEmployee({ ...employee, exam_type: v })} options={EXAM_TYPES} />
                <GlassDatePicker value={employee.scheduled_for} onChange={(v) => setEmployee({ ...employee, scheduled_for: v })} />
              </div>
              <button onClick={() => addEmployee.mutate()} disabled={addEmployee.isPending} className="rounded-full bg-olive px-5 py-2 text-sm font-medium text-ivory shadow-soft hover:opacity-90 disabled:opacity-60">
                Add employee
              </button>
            </Card>

            <Card className="space-y-2 p-5">
              <h3 className="text-sm font-semibold text-foreground">Campaign employees</h3>
              {(employees.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No employees yet.</p>}
              {(employees.data ?? []).map((e: any) => (
                <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{e.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {EXAM_TYPES.find((t) => t.value === e.exam_type)?.label ?? e.exam_type}
                      {e.role_title ? ` - ${e.role_title}` : ""}
                      {e.branch ? ` - ${e.branch}` : ""}
                      {e.scheduled_for ? ` - ${new Date(e.scheduled_for + "T00:00:00").toLocaleDateString("en-US")}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Pill tone={e.status === "done" ? "moss" : e.status === "absent" ? "wine" : "gold"}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </Pill>
                    {e.status !== "done" && (
                      <button onClick={() => setStatus(e, "done")} className="rounded-full bg-moss px-3 py-1.5 font-medium text-ivory">
                        Complete
                      </button>
                    )}
                    {e.status === "pending" && (
                      <button onClick={() => setStatus(e, "scheduled")} className="rounded-full border border-border bg-white/55 px-3 py-1.5">
                        Mark scheduled
                      </button>
                    )}
                    {e.status !== "absent" && (
                      <button onClick={() => setStatus(e, "absent")} className="rounded-full border border-border bg-white/55 px-3 py-1.5">
                        No-show
                      </button>
                    )}
                    <button onClick={() => removeEmployee(e)} className="rounded-full border border-wine/30 bg-wine/5 px-3 py-1.5 text-wine">
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        ) : (
          <EmptyState title="No company selected" hint="Register the first contracting company to build occupational campaigns." />
        )}
      </div>
    </div>
  );
}
