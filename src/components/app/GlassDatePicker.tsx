import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 * O painel renderiza em portal (document.body) para nunca ser coberto por outros cards.
 * value/onChange usam o formato "yyyy-MM-dd".
 */
export function GlassDatePicker({
  value: controlledValue,
  onChange,
  name,
  defaultValue = "",
  className = "",
  disabled = false,
}: {
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  defaultValue?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue ?? internalValue;
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const selected = useMemo(() => (value ? new Date(value + "T12:00:00") : undefined), [value]);

  const place = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left });
  };

  useLayoutEffect(() => {
    if (open) place();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!btnRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const reposition = () => place();
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const label = selected
    ? selected.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Selecionar data";

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={btnRef}
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
      {open &&
        !disabled &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
            className="rounded-2xl border border-white/75 bg-white/92 p-2 shadow-elevated ring-1 ring-white/40 backdrop-blur-2xl"
          >
            <Calendar
              mode="single"
              locale={ptBR}
              selected={selected}
              defaultMonth={selected}
              onSelect={(day) => {
                if (day) {
                  const key = toDayKey(day);
                  if (onChange) onChange(key);
                  else setInternalValue(key);
                  setOpen(false);
                }
              }}
              className="bg-transparent"
              classNames={{
                today: "rounded-md bg-baby/40 text-olive",
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Variante com data + hora (substitui input datetime-local nativo).
 * value/onChange usam o formato "yyyy-MM-ddTHH:mm" (vazio = sem agendamento).
 */
export function GlassDateTimePicker({
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
  const [datePart, timePart] = value ? value.split("T") : ["", ""];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <GlassDatePicker
        value={datePart}
        disabled={disabled}
        onChange={(day) => onChange(day ? `${day}T${timePart || "09:00"}` : "")}
      />
      <label className="flex items-center gap-2 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 text-xs text-foreground shadow-soft backdrop-blur-xl transition hover:bg-white/75">
        <svg
          viewBox="0 0 24 24"
          className="h-3.5 w-3.5 text-olive"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <input
          type="time"
          value={timePart || ""}
          disabled={disabled}
          onChange={(event) =>
            onChange(datePart ? `${datePart}T${event.target.value || "00:00"}` : "")
          }
          className="bg-transparent text-xs text-foreground outline-none [color-scheme:light]"
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-full border border-white/70 bg-white/55 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-soft backdrop-blur-xl transition hover:text-wine"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
