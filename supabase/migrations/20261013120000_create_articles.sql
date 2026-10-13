create table public.articles (
  id bigint generated always as identity primary key,
  title text not null check (title ~ '[^[:space:]]'),
  content text not null check (content ~ '[^[:space:]]'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.articles enable row level security;

revoke all on table public.articles from anon, authenticated;
revoke all on sequence public.articles_id_seq from anon, authenticated;

grant select, insert, update, delete on table public.articles to service_role;
grant usage, select on sequence public.articles_id_seq to service_role;

create function public.update_article_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_article_updated_at
before update on public.articles
for each row
execute function public.update_article_updated_at();
