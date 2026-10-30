-- FITAI MEAL SCANNING MIGRATION
-- Table: public.meal_scans

create table if not exists public.meal_scans (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  image_url text not null,
  image_kit_file_id text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  analysis_result jsonb,
  error_code text,
  error_message text,
  trigger_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for user scans ordered by latest
create index if not exists meal_scans_user_id_idx on public.meal_scans(user_id, created_at desc);

-- Auto-update updated_at timestamp
create or replace function public.set_meal_scans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meal_scans_set_updated_at on public.meal_scans;
create trigger meal_scans_set_updated_at
before update on public.meal_scans
for each row execute function public.set_meal_scans_updated_at();

-- Enable RLS
alter table public.meal_scans enable row level security;

-- Permissive policies for mobile app and Trigger.dev background worker
drop policy if exists "meal_scans_select_policy" on public.meal_scans;
create policy "meal_scans_select_policy"
  on public.meal_scans for select
  using (true);

drop policy if exists "meal_scans_insert_policy" on public.meal_scans;
create policy "meal_scans_insert_policy"
  on public.meal_scans for insert
  with check (true);

drop policy if exists "meal_scans_update_policy" on public.meal_scans;
create policy "meal_scans_update_policy"
  on public.meal_scans for update
  using (true);
