import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { enUS } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const BASE_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function toDayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseTime(value: string) {
  const [hour = "", minute = ""] = value.slice(0, 5).split(":");
  return {
    hour: HOUR_OPTIONS.includes(hour) ? hour : "",
    minute: /^\d{2}$/.test(minute) ? minute : "",
  };
}

function mergeTime(hour: string, minute: string) {
  if (!hour && !minute) return "";
  return `${hour || "00"}:${minute || "00"}`;
}

/**
 * Glassmorphism calendar - replaces the native date input across the platform.
 * The panel renders in a portal (document.body) so it is never covered by other cards.
 * value/onChange use the "yyyy-MM-dd" format.
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
    ? selected.toLocaleDateString("en-US", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "Select date";

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
              locale={enUS}
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
                root: "w-fit text-foreground",
                month_caption: "flex h-8 items-center justify-center text-sm font-semibold text-foreground",
                weekdays: "mt-2 grid grid-cols-7 gap-1",
                weekday: "text-center text-[11px] font-medium uppercase text-muted-foreground",
                week: "mt-1 grid grid-cols-7 gap-1",
                day: "h-8 w-8 rounded-lg text-center text-sm",
                today: "rounded-lg bg-baby/35 text-olive",
                selected: "rounded-lg bg-olive text-ivory",
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

export function GlassTimePicker({
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
  const value = (controlledValue ?? internalValue).slice(0, 5);
  const { hour, minute } = parseTime(value);
  const minuteOptions = useMemo(
    () => Array.from(new Set([...BASE_MINUTE_OPTIONS, minute].filter(Boolean))).sort(),
    [minute],
  );
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(260, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    setPos({ top: rect.bottom + 6, left });
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

  const commit = (nextHour: string, nextMinute: string) => {
    const nextValue = mergeTime(nextHour, nextMinute);
    if (onChange) onChange(nextValue);
    else setInternalValue(nextValue);
  };

  const timeColumn = (label: string, options: string[], active: string, select: (option: string) => void) => (
    <div className="min-w-0 flex-1">
      <div className="px-2 pb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto pr-1 [scrollbar-color:rgba(29,82,55,.34)_transparent] [scrollbar-width:thin]">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => select(option)}
            className={`flex h-9 w-full items-center justify-center rounded-xl text-sm font-medium transition ${
              active === option
                ? "bg-olive text-ivory shadow-soft"
                : "bg-white/38 text-foreground hover:bg-baby/35 hover:text-olive"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

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
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span className="min-w-10 text-left tabular-nums">{value || "--:--"}</span>
      </button>
      {open &&
        !disabled &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
            className="w-[260px] rounded-[1.4rem] border border-white/75 bg-white/82 p-3 shadow-elevated ring-1 ring-white/40 backdrop-blur-2xl"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-foreground">Time</span>
              <button
                type="button"
                onClick={() => {
                  commit("", "");
                  setOpen(false);
                }}
                className="rounded-full border border-white/70 bg-white/50 px-2.5 py-1 text-[11px] text-muted-foreground transition hover:bg-white/80 hover:text-wine"
              >
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {timeColumn("Hour", HOUR_OPTIONS, hour, (nextHour) => commit(nextHour, minute || "00"))}
              {timeColumn("Minute", minuteOptions, minute, (nextMinute) => commit(hour || "00", nextMinute))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Date + time variant (replaces the native datetime-local input).
 * value/onChange use the "yyyy-MM-ddTHH:mm" format.
 */
export function GlassDateTimePicker({
  value,
  onChange,
  name,
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [datePart, rawTimePart] = value ? value.split("T") : ["", ""];
  const timePart = rawTimePart?.slice(0, 5) || "";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <GlassDatePicker
        value={datePart}
        disabled={disabled}
        onChange={(day) => onChange(day ? `${day}T${timePart || "09:00"}` : "")}
      />
      <GlassTimePicker
        value={timePart}
        disabled={disabled}
        onChange={(time) => onChange(datePart ? `${datePart}T${time || "00:00"}` : "")}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-full border border-white/70 bg-white/55 px-2.5 py-1.5 text-[11px] text-muted-foreground shadow-soft backdrop-blur-xl transition hover:text-wine"
        >
          Clear
        </button>
      )}
    </div>
  );
}
