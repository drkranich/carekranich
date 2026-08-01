import { useEffect, useMemo, useState, type CSSProperties } from "react";

/**
 * "My Origins" reveal sequence:
 * 1) preparation with particles  2) DNA helix formed by dots
 * 3) helix breaks into particles that travel to the map.
 */
export function AncestryReveal({
  patientName,
  speed = "normal",
  reducedMotion = false,
  onFinish,
}: {
  patientName: string;
  speed?: string;
  reducedMotion?: boolean;
  onFinish: () => void;
}) {
  const [stage, setStage] = useState<"intro" | "helix" | "dissolve">("intro");
  const factor = speed === "lenta" ? 1.35 : speed === "rapida" ? 0.7 : 1;

  const particles = useMemo(
    () =>
      Array.from({ length: 46 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 4,
        duration: 6 + Math.random() * 8,
      })),
    [],
  );

  const helix = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const t = i / 33;
        const y = t * 300;
        const phase = t * Math.PI * 4;
        return { id: i, y, x1: Math.sin(phase) * 52, x2: Math.sin(phase + Math.PI) * 52, delay: t * 1.1 };
      }),
    [],
  );

  useEffect(() => {
    if (stage !== "helix") return;
    const t1 = window.setTimeout(() => setStage("dissolve"), 4200 * factor);
    return () => window.clearTimeout(t1);
  }, [stage, factor]);

  useEffect(() => {
    if (stage !== "dissolve") return;
    const t2 = window.setTimeout(() => onFinish(), 1800 * factor);
    return () => window.clearTimeout(t2);
  }, [stage, factor, onFinish]);

  const start = () => {
    if (reducedMotion) {
      onFinish();
      return;
    }
    setStage("helix");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#0b1512]">
      {/* background particles */}
      {!reducedMotion && (
        <div className="pointer-events-none absolute inset-0">
          {particles.map((p) => (
            <span
              key={p.id}
              className="absolute rounded-full bg-[#f2c078]"
              style={{
                left: `${p.left}%`,
                top: `${p.top}%`,
                width: p.size,
                height: p.size,
                opacity: 0.35,
                animation: `ck-float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes ck-float { from { transform: translateY(0) } to { transform: translateY(-26px) } }
        @keyframes ck-fade-in { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
        @keyframes ck-spin { from { transform: rotateY(0deg) } to { transform: rotateY(360deg) } }
        @keyframes ck-scatter { to { transform: translate(var(--dx), var(--dy)) scale(0.3); opacity: 0 } }
      `}</style>

      {stage === "intro" && (
        <div className="relative z-10 max-w-xl px-8 text-center">
          <p
            className="font-display text-2xl leading-relaxed text-[#f4efe2] md:text-3xl"
            style={{ animation: "ck-fade-in 1.2s ease both" }}
          >
            Your DNA carries paths traveled across many generations.
          </p>
          <p
            className="mt-6 text-base text-[#c9c2ae]"
            style={{ animation: "ck-fade-in 1.2s ease 1.6s both" }}
          >
            Now, part of that story can be revealed, {patientName}.
          </p>
          <button
            onClick={start}
            className="mt-10 rounded-full bg-[#c98a3a] px-8 py-3.5 text-sm font-medium text-[#0b1512] shadow-elevated transition hover:opacity-90"
            style={{ animation: "ck-fade-in 1s ease 2.6s both" }}
          >
            Discover my origins
          </button>
          {reducedMotion && (
            <p className="mt-4 text-xs text-[#8f9a8e]">Accessible mode: the animation will be skipped.</p>
          )}
        </div>
      )}

      {(stage === "helix" || stage === "dissolve") && (
        <div className="relative z-10 flex flex-col items-center">
          <div
            className="relative h-[320px] w-[160px]"
            style={{ animation: stage === "helix" ? `ck-spin ${9 * factor}s linear infinite` : undefined }}
          >
            {helix.map((h) => {
              const dx = `${(Math.random() - 0.5) * 900}px`;
              const dy = `${(Math.random() - 0.5) * 500}px`;
              const style: CSSProperties =
                stage === "dissolve"
                  ? ({ ["--dx" as any]: dx, ["--dy" as any]: dy, animation: `ck-scatter ${1.6 * factor}s ease-in ${h.delay * 0.2}s forwards` } as CSSProperties)
                  : { animation: `ck-fade-in .6s ease ${h.delay}s both` };
              return (
                <div key={h.id}>
                  <span
                    className="absolute rounded-full bg-[#f2c078]"
                    style={{ left: 78 + h.x1, top: h.y, width: 7, height: 7, ...style }}
                  />
                  <span
                    className="absolute rounded-full bg-[#7a9bd1]"
                    style={{ left: 78 + h.x2, top: h.y, width: 7, height: 7, ...style }}
                  />
                </div>
              );
            })}
          </div>
          <p className="mt-8 text-sm text-[#c9c2ae]">
            {stage === "helix" ? "Reading your genome markers..." : "Tracing the map of your origins..."}
          </p>
        </div>
      )}
    </div>
  );
}
