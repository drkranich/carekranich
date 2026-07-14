import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
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

function Documents() {
  const qc = useQueryClient();
  const { profile, user } = useAuth();
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("All");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("medical");
  const [uploading, setUploading] = useState(false);

  const docs = useQuery({
    queryKey: ["documents", profile?.tenant_id],
    enabled: !!profile?.tenant_id,
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
    if (!file || !profile?.tenant_id || !user) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
      const path = `${profile.tenant_id}/${user.id}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;

      const { error: rowError } = await (supabase as any).from("documents").insert({
        tenant_id: profile.tenant_id,
        owner_id: user.id,
        uploaded_by: user.id,
        title: title.trim() || file.name,
        document_type: documentType,
        bucket: "documents",
        storage_path: path,
        mime_type: file.type || "application/octet-stream",
        file_size: file.size,
        ai_summary: "Uploaded securely. OCR and AI extraction can run from a server job after provider setup.",
      });
      if (rowError) throw rowError;
      setFile(null);
      setTitle("");
      toast.success("Document uploaded to private storage");
      qc.invalidateQueries({ queryKey: ["documents", profile.tenant_id] });
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
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Could not open document");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const exportSummary = (doc: DocumentRow) => {
    downloadPdf(`${doc.title}-summary.pdf`, doc.title, [
      `Type: ${doc.document_type}`,
      `Status: ${doc.status}`,
      `Uploaded: ${new Date(doc.created_at).toLocaleString()}`,
      `Summary: ${doc.ai_summary ?? "No summary available yet."}`,
      `Storage path: ${doc.storage_path}`,
    ]);
  };

  return (
    <>
      <PageHeader
        title="Document intelligence"
        subtitle="Private uploads, signed access, PDF generation and audit-ready document metadata."
        action={<Pill tone="olive">Private Supabase Storage</Pill>}
      />

      <Card className="mb-6">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <input
            placeholder="Document title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
          />
          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value)}
            className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
          >
            <option value="medical">Medical</option>
            <option value="prescription">Prescription</option>
            <option value="contract">Contract</option>
            <option value="insurance">Insurance</option>
            <option value="certification">Certification</option>
            <option value="identity">Identity</option>
          </select>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-ivory px-3 py-2 text-sm">
            <Upload className="h-4 w-4" />
            {file ? file.name.slice(0, 22) : "Choose file"}
            <input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <button
            onClick={uploadDocument}
            disabled={!file || !profile?.tenant_id || uploading}
            className="rounded-xl bg-olive px-4 py-2 text-sm text-ivory disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-cream/40 px-4 py-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <input
            placeholder="Search prescriptions, contracts, lab results, dates..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-52 flex-1 bg-transparent text-sm focus:outline-none"
          />
          <Pill tone="gold">Real files only</Pill>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {["All", "medical", "prescription", "contract", "insurance", "certification", "identity"].map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`rounded-full px-3 py-1 ${
                tag === t ? "bg-olive text-ivory" : "border border-border text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Card>

      {!profile?.tenant_id ? (
        <EmptyState title="Join an approved organization first" hint="Private documents are scoped to a tenant." />
      ) : docs.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : filteredDocs.length === 0 ? (
        <EmptyState title="No documents yet" hint="Upload the first real file to create the vault." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredDocs.map((doc) => (
            <Card key={doc.id}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-olive text-xs font-semibold text-ivory">
                  {(doc.mime_type?.includes("pdf") ? "PDF" : doc.document_type.slice(0, 3)).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
                    <Pill tone="muted">{doc.document_type}</Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(doc.created_at).toLocaleDateString()} · {formatBytes(doc.file_size)} · {doc.status}
                  </p>
                  <p className="mt-3 rounded-xl border border-border/60 bg-cream/40 p-3 text-sm leading-6 text-foreground/85">
                    {doc.ai_summary ?? "No summary yet."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => openDocument(doc)} className="rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">
                      Open signed file
                    </button>
                    <button onClick={() => exportSummary(doc)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs">
                      <Download className="h-3 w-3" />
                      Export PDF
                    </button>
                  </div>
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
