-- NORTHSTAR 1.1 foundation schema
-- Blank-workspace model: no personal routines, goals, targets, or work hours are seeded.
-- Run in Supabase SQL Editor. Every user-owned table has RLS.

create extension if not exists pgcrypto;

create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text,
  theme text check (theme is null or theme in ('light','dark','system')),
  work_mode text,
  wake_time time,
  bedtime time,
  work_start time,
  work_end time,
  step_target integer check (step_target is null or step_target between 1000 and 30000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  category text not null default 'personal',
  target numeric,
  unit text,
  frequency text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  frequency jsonb not null default '{"type":"daily"}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  log_date date not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);

create table if not exists public.daily_priorities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  priority_date date not null,
  position smallint not null check (position between 1 and 10),
  title text not null check (char_length(title) between 1 and 120),
  completed boolean not null default false,
  unique (user_id, priority_date, position)
);

create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  title text not null check (char_length(title) between 1 and 140),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reflection_date date not null,
  intention text,
  proud text,
  improve text,
  tomorrow text,
  mood text check (mood is null or mood in ('Low','Okay','Good','Great')),
  updated_at timestamptz not null default now(),
  unique (user_id, reflection_date)
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Remove any legacy lifestyle defaults if this script is applied over an earlier schema.
alter table public.profiles
  alter column timezone drop default,
  alter column timezone drop not null,
  alter column theme drop default,
  alter column theme drop not null,
  alter column work_mode drop default,
  alter column work_mode drop not null,
  alter column wake_time drop default,
  alter column wake_time drop not null,
  alter column bedtime drop default,
  alter column bedtime drop not null,
  alter column work_start drop default,
  alter column work_start drop not null,
  alter column work_end drop default,
  alter column work_end drop not null,
  alter column step_target drop default,
  alter column step_target drop not null;

-- Create a minimal profile when a user signs up. No lifestyle defaults are assigned.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Enable RLS for every user-owned table.
do $$
declare t text;
begin
  foreach t in array array['profiles','user_goals','habits','habit_logs','daily_priorities','weekly_goals','reflections','user_preferences'] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists "profile_owner_all" on public.profiles;
create policy "profile_owner_all" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "goals_owner_all" on public.user_goals;
create policy "goals_owner_all" on public.user_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "habits_owner_all" on public.habits;
create policy "habits_owner_all" on public.habits for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "habit_logs_owner_all" on public.habit_logs;
create policy "habit_logs_owner_all" on public.habit_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "priorities_owner_all" on public.daily_priorities;
create policy "priorities_owner_all" on public.daily_priorities for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "weekly_goals_owner_all" on public.weekly_goals;
create policy "weekly_goals_owner_all" on public.weekly_goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "reflections_owner_all" on public.reflections;
create policy "reflections_owner_all" on public.reflections for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "preferences_owner_all" on public.user_preferences;
create policy "preferences_owner_all" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists user_goals_user_active_idx on public.user_goals(user_id, active);
create index if not exists habits_user_active_idx on public.habits(user_id, active, sort_order);
create index if not exists habit_logs_user_date_idx on public.habit_logs(user_id, log_date desc);
create index if not exists priorities_user_date_idx on public.daily_priorities(user_id, priority_date desc);
create index if not exists weekly_goals_user_week_idx on public.weekly_goals(user_id, week_start desc);
create index if not exists reflections_user_date_idx on public.reflections(user_id, reflection_date desc);

-- Users may only log completion for habits they own.
create or replace function public.validate_habit_log_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.habits h where h.id = new.habit_id and h.user_id = new.user_id) then
    raise exception 'Habit does not belong to this user';
  end if;
  return new;
end;
$$;
drop trigger if exists validate_habit_log_owner_trigger on public.habit_logs;
create trigger validate_habit_log_owner_trigger before insert or update on public.habit_logs
for each row execute procedure public.validate_habit_log_owner();

grant select, insert, update, delete on public.profiles, public.user_goals,
  public.habits, public.habit_logs, public.daily_priorities,
  public.weekly_goals, public.reflections, public.user_preferences
to authenticated;

insert into public.schema_migrations(version)
values ('1.1.0-blank-workspace')
on conflict (version) do nothing;
