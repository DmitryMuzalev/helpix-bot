create table public.clients (
  id bigint generated always as identity primary key,
  telegram_user_id bigint not null unique,
  telegram_chat_id bigint not null unique,
  username text,
  first_name text,
  last_name text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table public.messages (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id),
  telegram_message_id bigint not null,
  telegram_update_id bigint unique,
  sender text not null check (sender in ('client', 'bot')),
  message_text text,
  telegram_payload jsonb not null,
  sent_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique (client_id, telegram_message_id)
);

alter table public.clients enable row level security;
alter table public.messages enable row level security;

revoke all on table public.clients, public.messages
  from anon, authenticated;

create function public.update_client_last_message_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update public.clients
  set last_message_at = new.sent_at
  where id = new.client_id
    and (last_message_at is null or last_message_at < new.sent_at);

  return new;
end;
$$;

create trigger update_client_last_message_at
after insert on public.messages
for each row
execute function public.update_client_last_message_at();