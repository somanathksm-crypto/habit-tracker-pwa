-- Habit Tracker v1 schema (Supabase / Postgres)
-- Run this in the Supabase SQL editor once the project exists.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.

create extension if not exists pgcrypto;

-- ── habits ──────────────────────────────────────────────────────────
create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null check (category in ('diet', 'skincare', 'supplement', 'general')),
  frequency_type text not null check (frequency_type in ('daily', 'weekly', 'custom')),
  target_count int,
  created_at timestamptz not null default now()
);

-- ── habit_logs ──────────────────────────────────────────────────────
create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits (id) on delete cascade,
  log_date date not null,
  completed boolean not null default true,
  unique (habit_id, log_date)
);

-- ── weight_logs ─────────────────────────────────────────────────────
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  value numeric not null,
  unique (user_id, log_date)
);

-- ── weight_targets ──────────────────────────────────────────────────
create table if not exists weight_targets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  start_value numeric not null,
  target_value numeric not null,
  start_date date not null,
  target_date date not null
);

-- ── Row-Level Security ──────────────────────────────────────────────
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table weight_logs enable row level security;
alter table weight_targets enable row level security;

drop policy if exists "Users can manage their own habits" on habits;
create policy "Users can manage their own habits"
  on habits
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage logs for their own habits" on habit_logs;
create policy "Users can manage logs for their own habits"
  on habit_logs
  for all
  using (
    exists (
      select 1 from habits
      where habits.id = habit_logs.habit_id
      and habits.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from habits
      where habits.id = habit_logs.habit_id
      and habits.user_id = auth.uid()
    )
  );

drop policy if exists "Users can manage their own weight logs" on weight_logs;
create policy "Users can manage their own weight logs"
  on weight_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own weight targets" on weight_targets;
create policy "Users can manage their own weight targets"
  on weight_targets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── habit_stats view ────────────────────────────────────────────────
-- Pre-joins habits + habit_logs so client queries stay simple. Streaks
-- and completion % are still computed client-side / in RPCs, not stored.
create or replace view habit_stats as
select
  h.id as habit_id,
  h.user_id,
  h.name,
  h.category,
  h.frequency_type,
  h.target_count,
  count(l.id) filter (where l.completed) as completed_count,
  count(l.id) as logged_count,
  max(l.log_date) filter (where l.completed) as last_completed_date
from habits h
left join habit_logs l on l.habit_id = h.id
group by h.id;
