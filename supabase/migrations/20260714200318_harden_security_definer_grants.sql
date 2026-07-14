-- Security definer functions must not be callable by anonymous clients.
-- Authenticated access is intentionally kept only for RPCs that perform their
-- own auth.uid()/role checks or are used by RLS helpers.

revoke execute on function public.audit_essential_change() from anon, authenticated;

revoke execute on function public.is_super_admin(uuid) from anon;
revoke execute on function public.has_role(uuid, public.app_role) from anon;
revoke execute on function public.has_any_role(uuid, public.app_role[]) from anon;
revoke execute on function public.user_tenant(uuid) from anon;
revoke execute on function public.has_tenant_role(uuid, uuid, public.app_role[]) from anon;
revoke execute on function public.can_manage_tenant(uuid, uuid) from anon;

revoke execute on function public.request_join_by_invite(text) from anon;
revoke execute on function public.request_new_tenant(text, text, text, jsonb) from anon;
revoke execute on function public.review_platform_approval(uuid, text, text) from anon;
revoke execute on function public.review_identity_verification(uuid, text) from anon;
revoke execute on function public.set_profile_account_status(uuid, text, text) from anon;
revoke execute on function public.current_tenant_access() from anon;
revoke execute on function public.set_tenant_operational_status(uuid, text, text, text) from anon;

grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_any_role(uuid, public.app_role[]) to authenticated;
grant execute on function public.user_tenant(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, uuid, public.app_role[]) to authenticated;
grant execute on function public.can_manage_tenant(uuid, uuid) to authenticated;
grant execute on function public.request_join_by_invite(text) to authenticated;
grant execute on function public.request_new_tenant(text, text, text, jsonb) to authenticated;
grant execute on function public.review_platform_approval(uuid, text, text) to authenticated;
grant execute on function public.review_identity_verification(uuid, text) to authenticated;
grant execute on function public.set_profile_account_status(uuid, text, text) to authenticated;
grant execute on function public.current_tenant_access() to authenticated;
grant execute on function public.set_tenant_operational_status(uuid, text, text, text) to authenticated;
