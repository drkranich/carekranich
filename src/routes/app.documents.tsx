import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Download, FileText, Pencil, Share2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { GlassSelect } from "@/components/app/GlassSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/documents")({ component: Documents });

type DocumentRow = {
  id: string;
  title: string;
  document_type: string;
  bucket: string;
  storage_path: string;
  mime_type: string | null;
  file_size: number | null;
  ai_summary: string | null;
  status: string;
  created_at: string;
};

const documentTypeOptions = [
  { value: "medical", label: "Medical" },
  { value: "prescription", label: "Prescription" },
  { value: "contract", label: "Contract" },
  { value: "insurance", label: "Insurance" },
  { value: "certification", label: "Certification" },
  { value: "identity", label: "Identity" },
];

const TAGS = [
  { value: "All", label: "All" },
  ...documentTypeOptions,
];

function Documents() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("medical");
  const [uploading, setUploading] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocDraft, setEditDocDraft] = useState({ title: "", document_type: "medical", ai_summary: "" });

  const tenantsList = useQuery({
    queryKey: ["documents-tenants", isSuperAdmin],
    enabled: isSuperAdmin && !profile?.tenant_id,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("tenants").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const effTenant = profile?.tenant_id ?? ((tenantsList.data ?? [])[0] as any)?.id ?? null;

  const docs = useQuery({
    queryKey: ["documents", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("documents")
        .select("id,title,document_type,bucket,storage_path,mime_type,file_size,ai_summary,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DocumentRow[];
    },
  });

  const filteredDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (docs.data ?? []).filter((doc) => {
      const tagMatch = tag === "All" || doc.document_type === tag;
      const queryMatch = !q || `${doc.title} ${doc.document_type} ${doc.ai_summary ?? ""}`.toLowerCase().includes(q);
      return tagMatch && queryMatch;
    });
  }, [docs.data, query, tag]);

  const uploadDocument = async () => {
    if (!file || !effTenant || !user) {
      toast.error("Choose a file before uploading.");
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
      const path = `${effTenant}/${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: rowError } = await (supabase as any).from("documents").insert({
        tenant_id: effTenant,
        owner_id: user.id,
        uploaded_by: user.id,
        title: title.trim() || file.name,
        document_type: documentType,
        bucket: "documents",
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        ai_summary: "Uploaded securely. OCR and AI extraction run in a dedicated service after provider connection.",
      });
      if (rowError) throw rowError;
      setFile(null);
      setTitle("");
      toast.success("Document uploaded to the private vault");
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openDocument = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage
      .from(doc.bucket)
      .createSignedUrl(doc.storage_path, 60 * 5);
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Could not open the document");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const exportSummary = (doc: DocumentRow) => {
    downloadPdf(`${doc.title}-resumo.pdf`, doc.title, [
      `Tipo: ${documentTypeOptions.find((t) => t.value === doc.document_type)?.label ?? doc.document_type}`,
      `Status: ${doc.status}`,
      `Uploaded at: ${new Date(doc.created_at).toLocaleString("en-US")}`,
      `Summary: ${doc.ai_summary ?? "No summary available yet."}`,
      `Vault path: ${doc.storage_path}`,
    ]);
  };

  const startEditDocument = (doc: DocumentRow) => {
    setEditingDocId(doc.id);
    setEditDocDraft({
      title: doc.title,
      document_type: doc.document_type,
      ai_summary: doc.ai_summary ?? "",
    });
  };

  const saveDocumentEdit = async (doc: DocumentRow) => {
    if (!editDocDraft.title.trim()) return toast.error("Enter the document title.");
    const { data, error } = await (supabase as any)
      .from("documents")
      .update({
        title: editDocDraft.title.trim(),
        document_type: editDocDraft.document_type,
        ai_summary: editDocDraft.ai_summary.trim() || null,
      })
      .eq("id", doc.id)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Document was not updated. Check your permissions.");
    toast.success("Document updated");
    setEditingDocId(null);
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const archiveDocument = async (doc: DocumentRow) => {
    const nextStatus = doc.status === "archived" ? "uploaded" : "archived";
    const { data, error } = await (supabase as any)
      .from("documents")
      .update({ status: nextStatus })
      .eq("id", doc.id)
      .select("id")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Document was not archived. Check your permissions.");
    toast.success(nextStatus === "archived" ? "Document archived" : "Document restored");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  const shareDocument = async (doc: DocumentRow) => {
    const { data, error } = await supabase.storage.from(doc.bucket).createSignedUrl(doc.storage_path, 60 * 60 * 24);
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Could not generate sharing link");
    try {
      await navigator.clipboard.writeText(data.signedUrl);
      toast.success("Signed link copied for 24 hours");
    } catch {
      window.prompt("Copy the signed link:", data.signedUrl);
    }
  };

  const deleteDocument = async (doc: DocumentRow) => {
    if (!window.confirm(`Permanently delete "${doc.title}"?`)) return;
    const { data, error } = await (supabase as any)
      .from("documents")
      .delete()
      .eq("id", doc.id)
      .select("id,bucket,storage_path")
      .maybeSingle();
    if (error) return toast.error(error.message);
    if (!data) return toast.error("Document was not deleted. Check your permissions.");
    const { error: storageError } = await supabase.storage.from(doc.bucket).remove([doc.storage_path]);
    if (storageError) toast.warning(`Record deleted, but the file was not removed: ${storageError.message}`);
    else toast.success("Document deleted");
    qc.invalidateQueries({ queryKey: ["documents"] });
  };

  return (
    <>
      <PageHeader
        title="Document intelligence"
        subtitle="Private uploads, signed access, PDF generation and audit-ready metadata."
        action={<Pill tone="olive">Private storage</Pill>}
      />

      <Card className="relative z-30 mb-6 overflow-visible">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <input
            placeholder="Document title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
          />
          <GlassSelect
            value={documentType}
            onChange={setDocumentType}
            options={documentTypeOptions}
          />
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-ivory px-3 py-2 text-sm">
            <Upload className="h-4 w-4" />
            {file ? file.name.slice(0, 22) : "Select file"}
            <input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <button
            onClick={uploadDocument}
            disabled={!file || !effTenant || uploading}
            className="rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50"
          >
            {uploading ? "Carregando..." : "Carregar"}
          </button>
        </div>
      </Card>

      <Card className="relative z-0 mb-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-cream/40 px-4 py-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <input
            placeholder="Search prescriptions, contracts, exam results, dates..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-52 flex-1 bg-transparent text-sm focus:outline-none"
          />
          <Pill tone="gold">Real files only</Pill>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {TAGS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTag(t.value)}
              className={`rounded-full px-3 py-1 ${
                tag === t.value ? "bg-olive text-ivory" : "border border-border text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {!profile?.tenant_id && !isSuperAdmin ? (
        <EmptyState title="Join an approved organization first" hint="Private documents are linked to an organization." />
      ) : docs.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filteredDocs.length === 0 ? (
        <EmptyState title="No documents yet." hint="Upload the first real file to create the vault." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredDocs.map((doc) => (
            <Card key={doc.id}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-olive text-xs font-semibold text-ivory">
                  {(doc.mime_type?.includes("pdf") ? "PDF" : doc.document_type.slice(0, 3)).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  {editingDocId === doc.id ? (
                    <div className="space-y-2">
                      <input
                        value={editDocDraft.title}
                        onChange={(event) => setEditDocDraft({ ...editDocDraft, title: event.target.value })}
                        className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                      />
                      <GlassSelect
                        value={editDocDraft.document_type}
                        onChange={(value) => setEditDocDraft({ ...editDocDraft, document_type: value })}
                        options={documentTypeOptions}
                      />
                      <textarea
                        value={editDocDraft.ai_summary}
                        onChange={(event) => setEditDocDraft({ ...editDocDraft, ai_summary: event.target.value })}
                        rows={3}
                        className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => saveDocumentEdit(doc)} className="rounded-full bg-olive px-3 py-1.5 text-xs font-medium text-ivory">
                          Save
                        </button>
                        <button onClick={() => setEditingDocId(null)} className="rounded-full border border-border px-3 py-1.5 text-xs">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                        <Pill tone="muted">{documentTypeOptions.find((t) => t.value === doc.document_type)?.label ?? doc.document_type}</Pill>
                        {doc.status === "archived" && <Pill tone="gold">archived</Pill>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("en-US")} · {formatBytes(doc.file_size)} · {doc.status}
                      </p>
                      <p className="mt-3 rounded-xl border border-border/60 bg-cream/40 p-3 text-sm leading-6 text-foreground/85">
                        {doc.ai_summary ?? "No summary yet."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => openDocument(doc)} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">
                          Open signed file
                        </button>
                        <button onClick={() => startEditDocument(doc)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs">
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button onClick={() => shareDocument(doc)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs">
                          <Share2 className="h-3 w-3" /> Share
                        </button>
                        <button onClick={() => archiveDocument(doc)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs">
                          <Archive className="h-3 w-3" /> {doc.status === "archived" ? "Restore" : "Archive"}
                        </button>
                        <button onClick={() => deleteDocument(doc)} className="inline-flex items-center gap-1 rounded-full border border-wine/30 bg-wine/5 px-3 py-1.5 text-xs text-wine">
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                        <button onClick={() => exportSummary(doc)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs">
                          <Download className="h-3 w-3" /> Exportar PDF
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

function formatBytes(value: number | null) {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
