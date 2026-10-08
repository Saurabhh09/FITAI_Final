-- FITAI: User Nutrition Profiles & Target Snapshot Migration
-- Local migration only. DO NOT apply to hosted database without explicit review.

begin;

create table if not exists public.user_nutrition_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  -- Sensitive Personal Data (Strictly protected; used for chronological BMR calculation)
  birth_date date not null check (birth_date <= current_date and birth_date >= '1900-01-01'),

  -- Core Anthropometric Baseline (Stored strictly in canonical metric units)
  sex_for_calculation text not null check (sex_for_calculation in ('male', 'female', 'unspecified')),
  height_cm numeric(5,1) not null check (height_cm between 100.0 and 260.0),
  weight_kg numeric(5,1) not null check (weight_kg between 30.0 and 350.0),

  -- Activity & Lifestyle
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'very')),
  workouts_per_week text not null default '0-2' check (workouts_per_week in ('0-2', '3-5', '6+')),

  -- Primary Goal & Dynamics (target_weight_kg & weekly_pace_kg are nullable for 'maintain' goals)
  goal text not null check (goal in ('lose_weight', 'maintain', 'gain_weight')),
  target_weight_kg numeric(5,1) check (target_weight_kg is null or (target_weight_kg between 30.0 and 350.0)),
  weekly_pace_kg numeric(3,2) check (weekly_pace_kg is null or (weekly_pace_kg between 0.10 and 1.50)),

  -- Habits & Preferences (Non-sensitive; nullable where questions are skippable)
  dietary_style text check (dietary_style is null or dietary_style in ('balanced', 'vegetarian', 'vegan', 'pescatarian', 'mediterranean', 'high-protein')),
  meals_per_day smallint check (meals_per_day is null or (meals_per_day between 1 and 8)),
  calorie_rollover boolean not null default false,

  -- Derived Target Snapshots (Treated as cache, recalculable by @fitai/nutrition-engine)
  calculation_version text not null default '1.0.0',
  calculated_at timestamptz not null default now(),
  target_calories integer not null check (target_calories between 1000 and 6000),
  target_protein_grams integer not null check (target_protein_grams between 30 and 400),
  target_carbs_grams integer not null check (target_carbs_grams between 0 and 800),
  target_fat_grams integer not null check (target_fat_grams between 20 and 300),
  target_fiber_grams integer not null default 28 check (target_fiber_grams between 10 and 100),
  target_water_ml integer not null default 2500 check (target_water_ml between 1000 and 10000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documentation comments on sensitive PII and snapshot cache boundaries
comment on table public.user_nutrition_profiles is
  'User baseline metrics for deterministic nutrition calculations. Target fields are derived cache snapshots.';

comment on column public.user_nutrition_profiles.birth_date is
  'Sensitive PII: Chronological birth date used strictly for deterministic BMR calculation. Must not be exposed in public APIs.';

comment on column public.user_nutrition_profiles.target_calories is
  'Derived calculation snapshot (cache). Source of truth is input baseline + @fitai/nutrition-engine.';

-- Row-Level Security: strictly user-scoped
alter table public.user_nutrition_profiles enable row level security;

create policy user_nutrition_profiles_owner_all on public.user_nutrition_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Automatic updated_at trigger (using existing set_updated_at function)
create trigger user_nutrition_profiles_set_updated_at
  before update on public.user_nutrition_profiles
  for each row execute function public.set_updated_at();

-- Grant permissions aligned with existing schema
grant select, insert, update, delete on public.user_nutrition_profiles to authenticated;

commit;
