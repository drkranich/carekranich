-- Keep branding writes authenticated-only. Anonymous users can read
-- platform_branding rows, but must never execute the mutating RPC.

revoke execute on function public.set_platform_branding(text, text, text, text, text)
  from public, anon;

grant execute on function public.set_platform_branding(text, text, text, text, text)
  to authenticated;
