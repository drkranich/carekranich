
-- Fix search_path on trigger function
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  insert into public.user_roles (user_id, role) values (new.id, 'family');
  return new;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- Lock down execute privileges on security definer helpers
revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.has_any_role(uuid, public.app_role[]) from public, anon;
revoke execute on function public.user_tenant(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_any_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.user_tenant(uuid) to authenticated;
