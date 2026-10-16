-- Initial installation; the matching cloud migration is applied through Supabase MCP.
create table public.fit_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null check (length(owner_hash) = 64),
  request_key uuid not null,
  request_hash text not null,
  kind text not null check (kind in ('design', 'quote')),
  prompt text not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  result jsonb,
  created_at timestamptz not null default now(),
  unique(owner_hash, request_key)
);
create index fit_jobs_created_idx on public.fit_jobs(created_at);
create index fit_jobs_owner_created_idx on public.fit_jobs(owner_hash, created_at);
create table public.fit_assets (
  id uuid primary key,
  owner_hash text not null check (length(owner_hash) = 64),
  storage_path text not null unique,
  content_type text not null,
  created_at timestamptz not null default now()
);
create index fit_assets_owner_idx on public.fit_assets(owner_hash);
create table public.fit_designs (
  id uuid primary key default gen_random_uuid(),
  owner_hash text not null check (length(owner_hash) = 64),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index fit_designs_owner_created_idx on public.fit_designs(owner_hash, created_at desc);
create table public.fit_quotes (
  id uuid primary key,
  owner_hash text not null check (length(owner_hash) = 64),
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index fit_quotes_owner_created_idx on public.fit_quotes(owner_hash, created_at desc);

-- Browser roles have no access. Next.js alone accesses these tables using a server secret.
alter table public.fit_jobs enable row level security;
alter table public.fit_assets enable row level security;
alter table public.fit_designs enable row level security;
alter table public.fit_quotes enable row level security;
revoke all on public.fit_jobs, public.fit_assets, public.fit_designs, public.fit_quotes from anon, authenticated;
grant select, insert, update, delete on public.fit_jobs, public.fit_assets, public.fit_designs, public.fit_quotes to service_role;
create policy fit_jobs_server_only on public.fit_jobs to service_role using (true) with check (true);
create policy fit_assets_server_only on public.fit_assets to service_role using (true) with check (true);
create policy fit_designs_server_only on public.fit_designs to service_role using (true) with check (true);
create policy fit_quotes_server_only on public.fit_quotes to service_role using (true) with check (true);

-- Serializes reservations across all server instances before any paid AI request.
create function public.fit_reserve_job(p_owner text, p_key uuid, p_hash text, p_kind text, p_prompt text, p_daily integer, p_hourly integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare existing public.fit_jobs; reserved public.fit_jobs;
begin
  perform pg_advisory_xact_lock(183746529);
  select * into existing from public.fit_jobs where owner_hash = p_owner and request_key = p_key;
  if found then
    if existing.request_hash <> p_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('fresh', false, 'job', to_jsonb(existing));
  end if;
  if p_daily < 1 or p_hourly < 1 then raise exception 'LIMIT_REACHED'; end if;
  if (select count(*) from public.fit_jobs where created_at >= date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul') >= p_daily
    or (select count(*) from public.fit_jobs where owner_hash = p_owner and created_at > now() - interval '1 hour') >= p_hourly then
    raise exception 'LIMIT_REACHED';
  end if;
  insert into public.fit_jobs(owner_hash, request_key, request_hash, kind, prompt) values(p_owner, p_key, p_hash, p_kind, p_prompt) returning * into reserved;
  return jsonb_build_object('fresh', true, 'job', to_jsonb(reserved));
end $$;
revoke execute on function public.fit_reserve_job(text, uuid, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.fit_reserve_job(text, uuid, text, text, text, integer, integer) to service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('fit-private', 'fit-private', false, 20971520, array['image/png', 'image/jpeg', 'image/webp'])
on conflict(id) do nothing;
