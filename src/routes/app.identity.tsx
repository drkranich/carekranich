import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { Card, PageHeader, Pill, Stat } from "@/components/app/primitives";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/app/identity")({ component: Identity });

function Identity() {
  const { profile, user, isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [cameraOpen, setCameraOpen] = useState(false);

  const checks = useQuery({
    queryKey: ["identity-verifications", profile?.tenant_id, user?.id, isSuperAdmin],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("identity_verifications").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = () =>
    qc.invalidateQueries({ queryKey: ["identity-verifications", profile?.tenant_id, user?.id, isSuperAdmin] });

  const saveSelfie = async (blob: Blob) => {
    if (!user) return;
    const path = `${user.id}/selfie-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("identity")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (uploadError) return toast.error(uploadError.message);

    const { error } = await (supabase as any).from("identity_verifications").upsert(
      {
        tenant_id: profile?.tenant_id,
        user_id: user.id,
        subject_type: profile?.user_kind === "clinic" ? "company_admin" : "person",
        provider: "stripe_identity",
        status: "pending",
        required: true,
        metadata: {
          selfie_path: path,
          captured_at: new Date().toISOString(),
          next_step: "Selfie captured. Awaiting administrator review.",
        },
      },
      { onConflict: "user_id,provider" },
    );
    if (error) return toast.error(error.message);
    await (supabase as any).from("profiles").update({ verification_status: "pending" }).eq("id", user.id);
    toast.success("Selfie sent for verification");
    setCameraOpen(false);
    refresh();
  };

  const viewSelfie = async (path: string) => {
    const { data, error } = await supabase.storage.from("identity").createSignedUrl(path, 300);
    if (error || !data?.signedUrl) return toast.error(error?.message ?? "Could not open the selfie");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const markVerified = async (id: string) => {
    const { error } = await (supabase as any).rpc("review_identity_verification", {
      _verification_id: id,
      _status: "verified",
    });
    if (error) toast.error(error.message);
    else refresh();
  };

  return (
    <>
      <PageHeader
        title="Identity verification"
        subtitle="Each person or company administrator sends a simple selfie with acceptance. Images stay in private storage with restricted access."
        action={<Pill tone="olive">Selfie + acceptance</Pill>}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Verifications" value={checks.data?.length ?? "-"} sub="Visible by permission" tone="olive" />
        <Stat label="Verified" value={(checks.data ?? []).filter((c: any) => c.status === "verified").length} sub="Identity approved" tone="moss" />
        <Stat label="Pending" value={(checks.data ?? []).filter((c: any) => c.status !== "verified").length} sub="Awaiting review" tone="gold" />
      </div>
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">My verification</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Take a selfie now. By submitting it, you declare that you are the account holder (electronic acceptance).
            </p>
          </div>
          <button onClick={() => setCameraOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm text-ivory">
            <Camera className="h-4 w-4" />
            Take selfie and accept
          </button>
        </div>
      </Card>

      {cameraOpen && <SelfieDialog onClose={() => setCameraOpen(false)} onCapture={saveSelfie} />}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {(checks.data ?? []).map((check: any) => (
          <Card key={check.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">{check.subject_type === "company_admin" ? "Company administrator" : "Individual person"}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {check.metadata?.captured_at ? `Selfie from ${new Date(check.metadata.captured_at).toLocaleString("en-US")}` : "No selfie submitted"}
                </p>
              </div>
              <Pill tone={check.status === "verified" ? "moss" : "gold"}>{check.status === "verified" ? "verified" : "pending"}</Pill>
            </div>
            <p className="mt-4 text-sm leading-6 text-foreground/80">{check.metadata?.next_step ?? "Awaiting verification result."}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {check.metadata?.selfie_path && (isSuperAdmin || check.user_id === user?.id) && (
                <button onClick={() => viewSelfie(check.metadata.selfie_path)} className="rounded-full border border-border bg-white/55 px-3 py-1.5 text-xs hover:bg-cream">
                  View selfie
                </button>
              )}
              {isSuperAdmin && check.status !== "verified" && (
                <button onClick={() => markVerified(check.id)} className="inline-flex items-center gap-2 rounded-full bg-olive px-3 py-1.5 text-xs text-ivory">
                  <ShieldCheck className="h-3 w-3" />
                  Mark as verified
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function SelfieDialog({ onClose, onCapture }: { onClose: () => void; onCapture: (blob: Blob) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const sendFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Send an image file (JPG or PNG).");
      return;
    }
    setSending(true);
    onCapture(file);
  };

  useEffect(() => {
    let active = true;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 720 } }, audio: false })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setReady(true);
      })
      .catch(() => setError("Camera not found on this device. Send a photo using the button below."));
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    setSending(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 540;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) onCapture(blob);
        else {
          setSending(false);
          toast.error("Failed to capture the image");
        }
      },
      "image/jpeg",
      0.85,
    );
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/75 bg-white/85 shadow-elevated backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/60 px-5 py-4">
          <h3 className="text-lg font-semibold text-foreground">Verification selfie</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          {error ? (
            <p className="rounded-xl border border-wine/25 bg-wine/5 px-4 py-3 text-sm text-wine">{error}</p>
          ) : (
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full rounded-xl bg-foreground/10 object-cover" />
          )}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            By submitting the selfie, you accept the platform terms and declare that you are the account holder.
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(event) => sendFile(event.target.files?.[0] ?? null)}
            />
            <button onClick={onClose} className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs">Cancel</button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={sending}
              className="rounded-full border border-border bg-white/55 px-4 py-2 text-xs disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send device photo"}
            </button>
            {!error && (
              <button
                onClick={capture}
                disabled={!ready || sending}
                className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-xs font-semibold text-ivory disabled:opacity-50"
              >
                <Camera className="h-3.5 w-3.5" />
                {sending ? "Sending..." : "Capture and submit"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
