import { useEffect, useMemo, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { geocodeAddress, type GeoAddress } from "@/lib/geocoding";

export function GeoAddressField({
  label = "Address",
  value,
  onChange,
  placeholder = "Type a street, city, state or country",
}: {
  label?: string;
  value: GeoAddress | null;
  onChange: (value: GeoAddress | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value?.address ?? "");
  const [results, setResults] = useState<GeoAddress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(value?.address ?? "");
  }, [value?.address]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 4 || q === value?.address) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setResults(await geocodeAddress(q));
      } catch (err: any) {
        setError(err.message ?? "Address lookup failed");
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [query, value?.address]);

  const picked = useMemo(() => value?.latitude && value?.longitude, [value]);

  return (
    <label className="block text-sm">
      <span className="text-foreground/80">{label}</span>
      <div className="relative mt-1">
        <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange(null);
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-border bg-ivory py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
        />
        {loading && (
          <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">GPS...</span>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-wine">{error}</p>}
      {picked && (
        <p className="mt-1 flex items-center gap-1 text-xs text-moss">
          <Navigation className="h-3 w-3" />
          {value?.city || value?.state || value?.country || "Location identified"} ·{" "}
          {value?.latitude?.toFixed(5)}, {value?.longitude?.toFixed(5)}
        </p>
      )}
      {results.length > 0 && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/70 bg-white/90 p-1 shadow-soft backdrop-blur-xl">
          {results.map((item) => (
            <button
              key={`${item.latitude}-${item.longitude}-${item.address}`}
              type="button"
              onClick={() => {
                onChange(item);
                setQuery(item.address);
                setResults([]);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs leading-5 text-foreground hover:bg-baby/20"
            >
              {item.address}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}
