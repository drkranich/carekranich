export type GeoAddress = {
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  raw?: unknown;
};

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    region?: string;
    country?: string;
    country_code?: string;
    postcode?: string;
  };
};

export async function geocodeAddress(query: string): Promise<GeoAddress[]> {
  const q = query.trim();
  if (q.length < 4) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", q);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Address lookup failed");

  const results = (await response.json()) as NominatimResult[];
  return results.map((item) => {
    const a = item.address ?? {};
    return {
      address: item.display_name,
      city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
      state: a.state ?? a.region ?? null,
      country: a.country ?? null,
      country_code: a.country_code?.toUpperCase() ?? null,
      postal_code: a.postcode ?? null,
      latitude: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
      longitude: Number.isFinite(Number(item.lon)) ? Number(item.lon) : null,
      raw: item,
    };
  });
}
