-- Profile localization and preference fields.

alter table public.profiles
  add column if not exists preferred_language text,
  add column if not exists country text,
  add column if not exists country_code text,
  add column if not exists state text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists latitude numeric(10, 7),
  add column if not exists longitude numeric(10, 7),
  add column if not exists location_raw jsonb not null default '{}'::jsonb;

grant update (
  full_name,
  preferred_name,
  avatar_url,
  time_zone,
  phone,
  preferred_language,
  country,
  country_code,
  state,
  city,
  address,
  latitude,
  longitude,
  location_raw
) on public.profiles to authenticated;
