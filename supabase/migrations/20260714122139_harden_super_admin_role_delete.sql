-- Prevent accidental or client-side removal of super admin privileges.

drop policy if exists "roles scoped delete" on public.user_roles;

create policy "roles scoped delete" on public.user_roles
  for delete to authenticated
  using (
    (
      public.is_super_admin(auth.uid())
      and role <> 'super_admin'::public.app_role
    )
    or (
      public.can_manage_tenant(auth.uid(), tenant_id)
      and role <> 'super_admin'::public.app_role
    )
  );
