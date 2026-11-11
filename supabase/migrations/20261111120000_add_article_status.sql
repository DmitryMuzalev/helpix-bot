-- Existing and newly created articles start as drafts until explicitly published.
alter table public.articles
  add column status text not null default 'draft',
  add constraint articles_status_check check (status in ('draft', 'published'));
