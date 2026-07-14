import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PlatformBranding = {
  brand_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  updated_at?: string | null;
};

const DEFAULT_BRAND_NAME = "Care Kranich";

export function usePlatformBranding() {
  return useQuery({
    queryKey: ["platform-branding"],
    staleTime: 60_000,
    queryFn: async (): Promise<PlatformBranding> => {
      const { data, error } = await (supabase as any)
        .from("platform_branding")
        .select("brand_name,logo_url,favicon_url,updated_at")
        .eq("id", true)
        .maybeSingle();
      if (error) throw error;
      return {
        brand_name: data?.brand_name ?? DEFAULT_BRAND_NAME,
        logo_url: data?.logo_url ?? null,
        favicon_url: data?.favicon_url ?? null,
        updated_at: data?.updated_at ?? null,
      };
    },
  });
}

export function PlatformBrandRuntime() {
  const { data } = usePlatformBranding();

  useEffect(() => {
    if (!data?.favicon_url || typeof document === "undefined") return;
    let icon = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = data.favicon_url;
  }, [data?.favicon_url]);

  return null;
}

export function PlatformBrandLogo({
  className = "",
  iconClassName = "h-8 w-8 rounded-xl",
  textClassName = "font-display text-2xl text-olive",
  showText = true,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}) {
  const { data } = usePlatformBranding();
  const brandName = data?.brand_name ?? DEFAULT_BRAND_NAME;

  return (
    <span className={`flex min-w-0 items-center gap-2 ${className}`}>
      {data?.logo_url ? (
        <img
          src={data.logo_url}
          alt={brandName}
          className={`${iconClassName} object-contain ring-1 ring-white/55`}
        />
      ) : (
        <span className={`flex items-center justify-center bg-gradient-olive text-ivory shadow-soft ${iconClassName}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2c3 4 5 7 5 11a5 5 0 1 1-10 0c0-4 2-7 5-11z" />
          </svg>
        </span>
      )}
      {showText && <span className={`truncate ${textClassName}`}>{brandName}</span>}
    </span>
  );
}
