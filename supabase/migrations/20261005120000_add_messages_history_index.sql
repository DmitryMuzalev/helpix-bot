create index messages_client_history_idx
  on public.messages (client_id, sent_at desc, id desc);
