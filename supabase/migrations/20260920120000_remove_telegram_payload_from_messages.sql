alter table public.messages
  add column reply_to_update_id bigint;

update public.messages
set reply_to_update_id = (telegram_payload ->> '_reply_to_update_id')::bigint
where sender = 'bot'
  and telegram_payload ? '_reply_to_update_id';

create index messages_bot_reply_lookup_idx
  on public.messages (client_id, reply_to_update_id)
  where sender = 'bot' and reply_to_update_id is not null;

alter table public.messages
  drop column telegram_payload;
