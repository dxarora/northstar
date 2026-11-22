-- Northstar 1.1.1: structured workspace data model
-- Additive migration: preserves existing rows and the legacy user_preferences table.
-- Apply after supabase/schema.sql. Safe to re-run.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Long-term goals retain the existing active column for backwards compatibility.
alter table public.user_goals
  add column if not exists description text,
  add column if not exists status text,
  add column if not exists start_date date,
  add column if not exists target_date date,
  add column if not exists updated_at timestamptz not null default now();

update public.user_goals
set status = case when active then 'active' else 'archived' end
where status is null;

alter table public.user_goals
  alter column status set default 'active';

do $
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_goals_status_check'
      and conrelid = 'public.user_goals'::regclass
  ) then
    alter table public.user_goals
      add constraint user_goals_status_check
      check (status in ('active', 'completed', 'paused', 'archived'));
  end if;
end;
$;

create index if not exists user_goals_user_status_idx
  on public.user_goals(user_id, status, created_at desc);

-- Weekly goals support ordering and reliable updates.
alter table public.weekly_goals
  add column if not exists sort_order integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists weekly_goals_user_week_order_idx
  on public.weekly_goals(user_id, week_start desc, sort_order);

-- Daily priorities support updated timestamps and stable ordered retrieval.
alter table public.daily_priorities
  add column if not exists updated_at timestamptz not null default now();

create index if not exists priorities_user_date_position_idx
  on public.daily_priorities(user_id, priority_date desc, position);

-- Daily focus: one record per account and local calendar date.
create table if not exists public.daily_focus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus_date date not null,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_focus_user_date_unique unique (user_id, focus_date)
);

-- Habit definitions and logs support modification history.
alter table public.habits
  add column if not exists description text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.habit_logs
  add column if not exists updated_at timestamptz not null default now();

-- Helpful index for a user's recent habit history.
create index if not exists habit_logs_user_habit_date_idx
  on public.habit_logs(user_id, habit_id, log_date desc);

-- Reflections already have updated_at in the initial schema.
-- Profile and preference tables also already have updated_at.

-- Enable RLS and define owner-only policies for daily focus.
alter table public.daily_focus enable row level security;

drop policy if exists "daily_focus_owner_all" on public.daily_focus;
create policy "daily_focus_owner_all"
  on public.daily_focus
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.daily_focus to authenticated;

-- Maintain updated_at in the database, regardless of which client writes.
drop trigger if exists user_goals_set_updated_at on public.user_goals;
create trigger user_goals_set_updated_at before update on public.user_goals
for each row execute procedure public.set_updated_at();

drop trigger if exists weekly_goals_set_updated_at on public.weekly_goals;
create trigger weekly_goals_set_updated_at before update on public.weekly_goals
for each row execute procedure public.set_updated_at();

drop trigger if exists daily_priorities_set_updated_at on public.daily_priorities;
create trigger daily_priorities_set_updated_at before update on public.daily_priorities
for each row execute procedure public.set_updated_at();

drop trigger if exists daily_focus_set_updated_at on public.daily_focus;
create trigger daily_focus_set_updated_at before update on public.daily_focus
for each row execute procedure public.set_updated_at();

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at before update on public.habits
for each row execute procedure public.set_updated_at();

drop trigger if exists habit_logs_set_updated_at on public.habit_logs;
create trigger habit_logs_set_updated_at before update on public.habit_logs
for each row execute procedure public.set_updated_at();

insert into public.schema_migrations(version)
values ('1.1.1-structured-workspace')
on conflict (version) do nothing;
