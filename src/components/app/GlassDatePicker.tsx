import { useEffect, useMemo, useRef, useState } from "react";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

function toDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calendário com glassmorphism — substitui o input date nativo em toda a plataforma.
 * value/onChange usam o formato "yyyy-MM-dd".
 */
export function GlassDatePicker({
  value,
  onChange,
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => (value ? new Date(value + "T12:00:00") : undefined), [value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const label = selected
    ? selected.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Selecionar data";

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 text-xs text-foreground shadow-soft backdrop-blur-xl transition hover:bg-white/75 hover:text-olive focus:outline-none focus:ring-2 focus:ring-olive/25 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-olive"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4 M8 2v4 M3 10h18" />
        </svg>
        {label}
      </button>
      {open && !disabled && (
        <div className="absolute left-0 top-10 z-[1000] rounded-2xl border border-white/75 bg-white/80 p-2 shadow-elevated ring-1 ring-white/40 backdrop-blur-2xl">
          <Calendar
            mode="single"
            locale={ptBR}
            selected={selected}
            defaultMonth={selected}
            onSelect={(day) => {
              if (day) {
                onChange(toDayKey(day));
                setOpen(false);
              }
            }}
            className="bg-transparent"
            classNames={{
              today: "rounded-md bg-baby/40 text-olive",
            }}
          />
        </div>
      )}
    </div>
  );
}
