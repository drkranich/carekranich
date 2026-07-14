import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileArchive, ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, EmptyState, PageHeader, Pill } from "@/components/app/primitives";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { downloadPdf } from "@/lib/pdf";

export const Route = createFileRoute("/app/memory")({ component: Memory });

type ResidentRow = {
  id: string;
  tenant_id: string;
  full_name: string;
  preferred_name: string | null;
};

type MemoryRow = {
  id: string;
  tenant_id: string | null;
  resident_id: string | null;
  title: string;
  memory_type: string;
  memory_date: string | null;
  memory_year: number | null;
  description: string | null;
  prompt: string | null;
  visibility: string;
  bucket: string;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: string;
  created_at: string;
};

const memoryTypes = ["photo", "audio", "video", "journal", "letter", "document"];
const visibilityOptions = ["private", "family", "tenant"];

function Memory() {
  const qc = useQueryClient();
  const { profile, user, isSuperAdmin } = useAuth();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    memory_type: "photo",
    memory_date: "",
    memory_year: "",
    resident_id: "",
    visibility: "private",
    prompt: "",
    description: "",
  });

  const residents = useQuery({
    queryKey: ["memory-residents", profile?.tenant_id, isSuperAdmin],
    enabled: !!profile?.tenant_id || isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("id,tenant_id,full_name,preferred_name")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ResidentRow[];
    },
  });

  const memories = useQuery({
    queryKey: ["legacy-memories", profile?.tenant_id],
    enabled: !!profile?.tenant_id || !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("legacy_memories")
        .select("id,tenant_id,resident_id,title,memory_type,memory_date,memory_year,description,prompt,visibility,bucket,storage_path,mime_type,file_size,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MemoryRow[];
    },
  });

  const residentName = useMemo(() => {
    const map = new Map<string, string>();
    (residents.data ?? []).forEach((resident) =>
      map.set(resident.id, resident.preferred_name || resident.full_name),
    );
    return map;
  }, [residents.data]);

  const filteredMemories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (memories.data ?? []).filter((memory) => {
      const matchesType = typeFilter === "all" || memory.memory_type === typeFilter;
      const searchable = [
        memory.title,
        memory.memory_type,
        memory.description,
        memory.prompt,
        memory.memory_year,
        memory.resident_id ? residentName.get(memory.resident_id) : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesType && (!q || searchable.includes(q));
    });
  }, [memories.data, query, residentName, typeFilter]);

  const selectedMemory =
    filteredMemories.find((memory) => memory.id === selectedId) ?? filteredMemories[0] ?? null;

  const saveMemory = async () => {
    const selectedResident = residents.data?.find((resident) => resident.id === draft.resident_id);
    const tenantId = profile?.tenant_id ?? selectedResident?.tenant_id;
    if (!tenantId || !user) {
      toast.error("Select a resident with an organization before creating memories.");
      return;
    }
    if (!draft.title.trim() && !file) {
      toast.error("Add a title or choose a file.");
      return;
    }

    setUploading(true);
    try {
      let storagePath: string | null = null;
      let mimeType: string | null = null;
      let fileSize: number | null = null;

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
        storagePath = `${tenantId}/${user.id}/${Date.now()}-${safeName}`;
        mimeType = file.type || "application/octet-stream";
        fileSize = file.size;
        const { error: uploadError } = await supabase.storage
          .from("memories")
          .upload(storagePath, file, { contentType: mimeType, upsert: false });
        if (uploadError) throw uploadError;
      }

      const { error: rowError } = await (supabase as any).from("legacy_memories").insert({
        tenant_id: tenantId,
        resident_id: draft.resident_id || null,
        owner_id: user.id,
        uploaded_by: user.id,
        title: draft.title.trim() || file?.name || "Untitled memory",
        memory_type: draft.memory_type,
        memory_date: draft.memory_date || null,
        memory_year: draft.memory_year ? Number(draft.memory_year) : null,
        description: draft.description.trim() || null,
        prompt: draft.prompt.trim() || null,
        visibility: draft.visibility,
        bucket: "memories",
        storage_path: storagePath,
        mime_type: mimeType,
        file_size: fileSize,
      });
      if (rowError) throw rowError;

      setFile(null);
      setDraft({
        title: "",
        memory_type: "photo",
        memory_date: "",
        memory_year: "",
        resident_id: "",
        visibility: "private",
        prompt: "",
        description: "",
      });
      toast.success("Memory saved to private archive");
      qc.invalidateQueries({ queryKey: ["legacy-memories", profile?.tenant_id] });
    } catch (err: any) {
      toast.error(err.message ?? "Could not save memory");
    } finally {
      setUploading(false);
    }
  };

  const openMemory = async (memory: MemoryRow) => {
    if (!memory.storage_path) {
      toast.info("This memory is text-only.");
      return;
    }
    const { data, error } = await supabase.storage
      .from(memory.bucket)
      .createSignedUrl(memory.storage_path, 60 * 5);
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? "Could not open memory file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const exportMemory = (memory: MemoryRow) => {
    downloadPdf(`${memory.title}-legacy.pdf`, memory.title, [
      `Type: ${memory.memory_type}`,
      `Resident: ${memory.resident_id ? residentName.get(memory.resident_id) ?? memory.resident_id : "Not linked"}`,
      `Date: ${memory.memory_date ?? memory.memory_year ?? "Not set"}`,
      `Visibility: ${memory.visibility}`,
      `Prompt: ${memory.prompt ?? "No prompt"}`,
      `Description: ${memory.description ?? "No description"}`,
      `File: ${memory.storage_path ?? "Text-only memory"}`,
    ]);
  };

  return (
    <>
      <PageHeader
        title="Memory & legacy"
        subtitle="Private archive for real photos, audio, letters, journals and legacy documents. Nothing here is sample content."
        action={<Pill tone="olive">Private Storage + RLS</Pill>}
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-olive/10 text-olive">
              <Upload className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Add real memory</h2>
              <p className="text-xs text-muted-foreground">
                Upload image, audio, video, PDF or save a text-only journal entry.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="Title"
              className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={draft.memory_type}
                onChange={(event) => setDraft({ ...draft, memory_type: event.target.value })}
                className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
              >
                {memoryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <select
                value={draft.visibility}
                onChange={(event) => setDraft({ ...draft, visibility: event.target.value })}
                className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
              >
                {visibilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={draft.memory_date}
                onChange={(event) => setDraft({ ...draft, memory_date: event.target.value })}
                className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
              />
              <input
                inputMode="numeric"
                value={draft.memory_year}
                onChange={(event) =>
                  setDraft({ ...draft, memory_year: event.target.value.replace(/\D/g, "").slice(0, 4) })
                }
                placeholder="Year"
                className="rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
              />
            </div>

            <select
              value={draft.resident_id}
              onChange={(event) => setDraft({ ...draft, resident_id: event.target.value })}
              className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
            >
              <option value="">Not linked to a resident</option>
              {(residents.data ?? []).map((resident) => (
                <option key={resident.id} value={resident.id}>
                  {resident.preferred_name || resident.full_name}
                </option>
              ))}
            </select>

            <textarea
              value={draft.prompt}
              onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}
              rows={2}
              placeholder="Prompt or question that inspired this memory"
              className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
            />
            <textarea
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              rows={4}
              placeholder="Description, transcript or context"
              className="w-full rounded-xl border border-border bg-ivory px-3 py-2 text-sm"
            />

            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border bg-ivory px-3 py-3 text-sm">
              <span className="min-w-0 truncate">{file ? file.name : "Choose file"}</span>
              <FileArchive className="h-4 w-4 flex-none text-muted-foreground" />
              <input
                type="file"
                accept="image/*,audio/*,video/*,application/pdf,text/plain"
                className="hidden"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <button
              onClick={saveMemory}
              disabled={uploading || !(profile?.tenant_id || draft.resident_id)}
              className="w-full rounded-xl bg-olive px-4 py-2.5 text-sm font-medium text-ivory disabled:opacity-50"
            >
              {uploading ? "Saving..." : "Save memory"}
            </button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-64 flex-1 items-center gap-2 rounded-2xl border border-border bg-cream/40 px-3 py-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search memories, residents, prompts..."
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", ...memoryTypes].map((type) => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`rounded-full px-3 py-1.5 text-xs ${
                      typeFilter === type
                        ? "bg-olive text-ivory"
                        : "border border-border bg-white/40 text-muted-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {!profile?.tenant_id && !isSuperAdmin ? (
            <EmptyState title="Join an approved organization first" hint="Memories are scoped to a tenant for privacy." />
          ) : memories.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading memories...</p>
          ) : memories.isError ? (
            <Card className="border-wine/25 bg-wine/5">
              <p className="font-medium text-wine">Could not load memories.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {(memories.error as Error).message}
              </p>
            </Card>
          ) : filteredMemories.length === 0 ? (
            <EmptyState
              title="No memories yet"
              hint="Upload the first real photo, audio, letter or journal entry."
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredMemories.map((memory) => (
                  <MemoryCard
                    key={memory.id}
                    memory={memory}
                    resident={memory.resident_id ? residentName.get(memory.resident_id) : null}
                    selected={selectedMemory?.id === memory.id}
                    onSelect={() => setSelectedId(memory.id)}
                  />
                ))}
              </div>

              {selectedMemory && (
                <Card>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Selected memory
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    {selectedMemory.title}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Pill tone="olive">{selectedMemory.memory_type}</Pill>
                    <Pill tone="muted">{selectedMemory.visibility}</Pill>
                    <Pill tone={selectedMemory.storage_path ? "moss" : "gold"}>
                      {selectedMemory.storage_path ? "file attached" : "text-only"}
                    </Pill>
                  </div>
                  <dl className="mt-5 space-y-3 text-sm">
                    <Detail label="Resident" value={selectedMemory.resident_id ? residentName.get(selectedMemory.resident_id) ?? selectedMemory.resident_id : "Not linked"} />
                    <Detail label="Date" value={selectedMemory.memory_date ?? String(selectedMemory.memory_year ?? "Not set")} />
                    <Detail label="File size" value={formatBytes(selectedMemory.file_size)} />
                    <Detail label="Status" value={selectedMemory.status} />
                  </dl>
                  {selectedMemory.prompt && (
                    <p className="mt-5 rounded-2xl border border-border/60 bg-cream/45 p-4 text-sm leading-6 text-foreground/80">
                      {selectedMemory.prompt}
                    </p>
                  )}
                  {selectedMemory.description && (
                    <p className="mt-3 rounded-2xl border border-border/60 bg-white/45 p-4 text-sm leading-6 text-foreground/80">
                      {selectedMemory.description}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => openMemory(selectedMemory)}
                      className="rounded-full bg-olive px-4 py-2 text-xs text-ivory"
                    >
                      Open signed file
                    </button>
                    <button
                      onClick={() => exportMemory(selectedMemory)}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export PDF
                    </button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MemoryCard({
  memory,
  resident,
  selected,
  onSelect,
}: {
  memory: MemoryRow;
  resident: string | null | undefined;
  selected: boolean;
  onSelect: () => void;
}) {
  const preview = useQuery({
    queryKey: ["memory-preview", memory.id, memory.storage_path],
    enabled: !!memory.storage_path && !!memory.mime_type?.startsWith("image/"),
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(memory.bucket)
        .createSignedUrl(memory.storage_path!, 60 * 10);
      if (error) throw error;
      return data.signedUrl;
    },
  });

  return (
    <button
      onClick={onSelect}
      className={`overflow-hidden rounded-2xl border text-left shadow-soft transition ${
        selected ? "border-olive/50 bg-olive/10" : "border-white/70 bg-white/55 hover:bg-white/75"
      }`}
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-cream via-white to-baby/25">
        {preview.data ? (
          <img src={preview.data} alt={memory.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-olive">
            <FileArchive className="h-9 w-9" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Pill tone={memory.storage_path ? "moss" : "gold"}>
            {memory.storage_path ? memory.memory_type : "journal"}
          </Pill>
        </div>
      </div>
      <div className="p-4">
        <p className="truncate text-sm font-semibold text-foreground">{memory.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {resident ?? "No resident"} · {memory.memory_date ?? memory.memory_year ?? formatDate(memory.created_at)}
        </p>
        {memory.description && (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-foreground/70">{memory.description}</p>
        )}
      </div>
    </button>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatBytes(value: number | null | undefined) {
  if (!value) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
