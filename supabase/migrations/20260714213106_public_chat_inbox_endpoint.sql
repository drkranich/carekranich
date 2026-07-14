create table if not exists public.public_chat_rate_limits (
  rate_key text primary key,
  email text not null,
  page text,
  window_started_at timestamptz not null,
  message_count integer not null default 1,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.public_chat_rate_limits enable row level security;

revoke all on public.public_chat_rate_limits from anon, authenticated;

create index if not exists idx_public_chat_rate_limits_window
  on public.public_chat_rate_limits(window_started_at);

create or replace function public.create_public_chat_thread(
  _name text,
  _email text,
  _message text,
  _page text default null,
  _company text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text := nullif(trim(coalesce(_name, '')), '');
  v_email text := lower(nullif(trim(coalesce(_email, '')), ''));
  v_message text := nullif(trim(coalesce(_message, '')), '');
  v_page text := nullif(left(trim(coalesce(_page, '')), 500), '');
  v_rate_key text;
  v_message_count integer;
  v_thread_id uuid;
  v_now timestamptz := now();
begin
  if nullif(trim(coalesce(_company, '')), '') is not null then
    raise exception 'Mensagem bloqueada.' using errcode = 'P0001';
  end if;

  if v_name is null or length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Informe um nome valido.' using errcode = '22023';
  end if;

  if v_email is null or length(v_email) > 180 or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' then
    raise exception 'Informe um e-mail valido.' using errcode = '22023';
  end if;

  if v_message is null or length(v_message) < 3 or length(v_message) > 3000 then
    raise exception 'A mensagem precisa ter entre 3 e 3000 caracteres.' using errcode = '22023';
  end if;

  delete from public.public_chat_rate_limits
  where window_started_at < v_now - interval '2 days';

  v_rate_key := md5(v_email || '|' || coalesce(v_page, 'site') || '|' || to_char(date_trunc('hour', v_now), 'YYYY-MM-DD HH24'));

  insert into public.public_chat_rate_limits (
    rate_key,
    email,
    page,
    window_started_at,
    message_count,
    last_message_at
  )
  values (
    v_rate_key,
    v_email,
    v_page,
    date_trunc('hour', v_now),
    1,
    v_now
  )
  on conflict (rate_key) do update
    set message_count = public.public_chat_rate_limits.message_count + 1,
        last_message_at = excluded.last_message_at
  returning message_count into v_message_count;

  if v_message_count > 5 then
    raise exception 'Muitas mensagens em pouco tempo. Tente novamente mais tarde.' using errcode = 'P0001';
  end if;

  insert into public.inbox_threads (
    tenant_id,
    subject,
    source,
    status,
    priority,
    created_by,
    assigned_to,
    participant_user_id,
    last_message_at
  )
  values (
    null,
    'Contato do site: ' || v_name,
    'public_site_chat',
    'open',
    'normal',
    null,
    null,
    null,
    v_now
  )
  returning id into v_thread_id;

  insert into public.inbox_messages (
    thread_id,
    sender_id,
    sender_label,
    body,
    channel,
    attachments
  )
  values (
    v_thread_id,
    null,
    v_name,
    v_message || E'\n\nContato: ' || v_name || ' <' || v_email || '>' || coalesce(E'\nPagina: ' || v_page, ''),
    'public_site_chat',
    jsonb_build_array(
      jsonb_build_object(
        'type', 'public_chat_metadata',
        'name', v_name,
        'email', v_email,
        'page', v_page
      )
    )
  );

  insert into public.audit_log (
    tenant_id,
    actor_id,
    action,
    target_table,
    target_id,
    metadata,
    severity,
    source
  )
  values (
    null,
    null,
    'public_chat.created',
    'inbox_threads',
    v_thread_id,
    jsonb_build_object(
      'name', v_name,
      'email', v_email,
      'page', v_page,
      'rate_count', v_message_count
    ),
    'info',
    'public_chat_rpc'
  );

  return jsonb_build_object(
    'ok', true,
    'thread_id', v_thread_id,
    'status', 'open'
  );
end;
$$;

revoke all on function public.create_public_chat_thread(text, text, text, text, text) from public;
grant execute on function public.create_public_chat_thread(text, text, text, text, text) to anon;
grant execute on function public.create_public_chat_thread(text, text, text, text, text) to authenticated;
