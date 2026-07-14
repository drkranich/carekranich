import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type GlassSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function GlassSelect({
  value,
  onChange,
  options,
  name,
  placeholder = "Selecionar",
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: GlassSelectOption[];
  name?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/55 px-4 py-2 text-left text-sm text-foreground shadow-soft backdrop-blur-xl transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-olive/25 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 flex-none text-olive transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && (
        <div className="absolute left-0 right-0 z-[80] mt-2 overflow-hidden rounded-2xl border border-white/75 bg-white/85 p-1 shadow-elevated backdrop-blur-2xl">
          <div className="max-h-72 overflow-y-auto app-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                  option.value === value
                    ? "bg-olive text-ivory"
                    : "text-foreground hover:bg-olive/10"
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
