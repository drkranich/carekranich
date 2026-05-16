
alter table public.profiles
  add column if not exists preferred_name text,
  add column if not exists time_zone text,
  add column if not exists phone text;

-- avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars user upload" on storage.objects;
create policy "avatars user upload" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars user update" on storage.objects;
create policy "avatars user update" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars user delete" on storage.objects;
create policy "avatars user delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- update handle_new_user to persist preferred_name
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, preferred_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'preferred_name', split_part(coalesce(new.raw_user_meta_data->>'full_name', new.email), ' ', 1))
  );
  insert into public.user_roles (user_id, role) values (new.id, 'family');
  return new;
end $$;
