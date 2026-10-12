-- Anonymous read access is intended for this learning project's test data.
-- Postgres Changes requires both SELECT privileges and an RLS SELECT policy.
grant select on table public.clients, public.messages to anon;

create policy clients_anon_select
  on public.clients
  for select
  to anon
  using (true);

create policy messages_anon_select
  on public.messages
  for select
  to anon
  using (true);

-- Preserve other published tables and allow tables already enabled in Dashboard.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clients'
  ) then
    alter publication supabase_realtime add table public.clients;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
