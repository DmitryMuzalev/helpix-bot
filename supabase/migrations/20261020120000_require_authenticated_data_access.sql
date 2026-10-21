-- Operator data is private now that the workspace requires Supabase Auth.
drop policy if exists clients_anon_select on public.clients;
drop policy if exists messages_anon_select on public.messages;

revoke all privileges on table public.clients, public.messages, public.articles from anon;
revoke all privileges on sequence
  public.clients_id_seq, public.messages_id_seq, public.articles_id_seq
  from anon;

-- Postgres Changes uses the signed-in operator's authenticated role and needs
-- both SELECT privileges and an RLS SELECT policy.
grant select on table public.clients, public.messages to authenticated;

create policy clients_authenticated_select
  on public.clients
  for select
  to authenticated
  using (true);

create policy messages_authenticated_select
  on public.messages
  for select
  to authenticated
  using (true);
