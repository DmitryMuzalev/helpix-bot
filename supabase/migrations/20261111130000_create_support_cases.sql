alter table public.clients
  add column full_name text,
  add column phone text,
  add constraint clients_full_name_not_blank
    check (full_name is null or full_name ~ '[^[:space:]]'),
  add constraint clients_phone_not_blank
    check (phone is null or phone ~ '[^[:space:]]');

create table public.support_cases (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id),
  status text not null default 'diagnosing'
    check (
      status in (
        'diagnosing',
        'waiting_solution_result',
        'checking_remote',
        'collecting_contacts',
        'awaiting_confirmation',
        'submitted',
        'resolved',
        'cancelled'
      )
    ),
  assistance_type text not null default 'unknown'
    check (assistance_type in ('unknown', 'remote', 'onsite')),
  problem_description text,
  can_device_start boolean,
  has_internet boolean,
  has_remote_consent boolean,
  remote_access_status text not null default 'unknown'
    check (remote_access_status in ('unknown', 'available', 'missing', 'declined', 'unavailable')),
  remote_access_program text,
  has_offered_installation_guide boolean not null default false,
  full_name text,
  phone text,
  address text,
  preferred_time text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  closed_at timestamptz,
  constraint support_cases_problem_description_not_blank
    check (problem_description is null or problem_description ~ '[^[:space:]]'),
  constraint support_cases_remote_access_program_not_blank
    check (remote_access_program is null or remote_access_program ~ '[^[:space:]]'),
  constraint support_cases_full_name_not_blank
    check (full_name is null or full_name ~ '[^[:space:]]'),
  constraint support_cases_phone_not_blank
    check (phone is null or phone ~ '[^[:space:]]'),
  constraint support_cases_address_not_blank
    check (address is null or address ~ '[^[:space:]]'),
  constraint support_cases_preferred_time_not_blank
    check (preferred_time is null or preferred_time ~ '[^[:space:]]')
);

comment on table public.support_cases is
  'One user problem from AI diagnosis through optional submission to an engineer.';

comment on column public.support_cases.status is
  'Only submitted cases are ready for an engineer; resolved and cancelled cases are closed.';

alter table public.messages
  add column support_case_id bigint references public.support_cases (id);

create unique index support_cases_one_active_per_client_idx
  on public.support_cases (client_id)
  where status not in ('resolved', 'cancelled');

create index support_cases_client_history_idx
  on public.support_cases (client_id, created_at desc, id desc);

create index messages_support_case_history_idx
  on public.messages (support_case_id, sent_at desc, id desc)
  where support_case_id is not null;

create function public.update_support_case_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_support_case_updated_at
before update on public.support_cases
for each row
execute function public.update_support_case_updated_at();

alter table public.support_cases enable row level security;

revoke all on table public.support_cases from anon, authenticated;
revoke all on sequence public.support_cases_id_seq from anon, authenticated;

grant select on table public.support_cases to authenticated;

create policy support_cases_authenticated_select
  on public.support_cases
  for select
  to authenticated
  using (true);
