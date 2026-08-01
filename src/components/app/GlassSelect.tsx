import { ChevronDown } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type GlassSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

/**
 * Dropdown com glassmorphism. O painel renderiza em portal (document.body)
 * para nunca ser cortado ou coberto por cards com backdrop-blur.
 */
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
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value]);

  const place = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
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

  return (
    <div className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/55 px-4 py-2 text-left text-sm text-foreground shadow-soft backdrop-blur-xl transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-olive/25 disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="min-w-0 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown className={`h-4 w-4 flex-none text-olive transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        !disabled &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 9999 }}
            className="overflow-hidden rounded-lg border border-white/75 bg-white/92 p-1 shadow-elevated ring-1 ring-white/40 backdrop-blur-2xl"
          >
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
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm transition ${
                    option.value === value
                      ? "bg-olive text-ivory"
                      : "text-foreground hover:bg-olive/10"
                  } disabled:cursor-not-allowed disabled:opacity-45`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
