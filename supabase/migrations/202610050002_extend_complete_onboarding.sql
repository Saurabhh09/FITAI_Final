-- FITAI: Extend complete_onboarding RPC with Atomic Nutrition Profile Persistence
-- Local migration file only. DO NOT apply to hosted database without explicit review.

begin;

-- Drop previous function signatures to prevent PostgREST ambiguous overload conflicts (PGRST204)
drop function if exists public.complete_onboarding(
  public.age_band,
  public.goal_type,
  text,
  text,
  text
);

drop function if exists public.complete_onboarding(
  public.age_band, public.goal_type, text, text, text,
  date, text, numeric, numeric, text, text, text, numeric, numeric, text, smallint, boolean,
  integer, integer, integer, integer, integer, integer, text, timestamptz
);

create or replace function public.complete_onboarding(
  -- Required profile & goal baseline inputs (original parameters)
  p_age_band public.age_band,
  p_goal public.goal_type,

  -- Required nutrition baseline inputs (canonical metric units; NO default clauses)
  p_birth_date date,
  p_sex_for_calculation text,
  p_height_cm numeric,
  p_weight_kg numeric,
  p_activity_level text,
  p_workouts_per_week text,
  p_nutrition_goal text,
  p_target_weight_kg numeric,
  p_weekly_pace_kg numeric,
  p_dietary_style text,
  p_meals_per_day smallint,
  p_calorie_rollover boolean,

  -- Required nutrition target snapshot inputs (derived strictly from @fitai/nutrition-engine; NO default clauses)
  p_target_calories integer,
  p_target_protein_grams integer,
  p_target_carbs_grams integer,
  p_target_fat_grams integer,
  p_target_fiber_grams integer,
  p_target_water_ml integer,
  p_calculation_version text,
  p_calculated_at timestamptz,

  -- Original optional profile fields (the ONLY parameters with default null clauses; placed at end for valid PostgreSQL grammar)
  p_sex_for_reference text default null,
  p_country_code text default null,
  p_display_name text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  v_nutrition_goal text := trim(p_nutrition_goal);
  v_calculated_at timestamptz := p_calculated_at;
begin
  -- 1. Authentication check: caller must be authenticated
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  -- 2. Validate original profile and goal fields
  if p_age_band is null or p_goal is null then
    raise exception using errcode = '22023', message = 'Age band and primary goal are required.';
  end if;
  if p_sex_for_reference is not null and p_sex_for_reference not in ('female', 'male', 'unspecified') then
    raise exception using errcode = '22023', message = 'Invalid reference category.';
  end if;
  if p_country_code is not null and p_country_code !~ '^[A-Z]{2}$' then
    raise exception using errcode = '22023', message = 'Country code must be two uppercase letters.';
  end if;
  if p_display_name is not null and char_length(trim(p_display_name)) > 80 then
    raise exception using errcode = '22023', message = 'Display name is too long.';
  end if;

  -- 3. Existing minor safety guard on goal: weight-loss deficit is disallowed for minors/unconfirmed age
  if p_goal = 'lose_weight'
     and p_age_band in ('under_13', '13_17', 'prefer_not_to_say') then
    raise exception using errcode = '23514', message = 'Weight-loss plans are not available for minors or unconfirmed age.';
  end if;

  -- 4. Validate nutrition profile baseline inputs
  if p_birth_date is null then
    raise exception using errcode = '22023', message = 'Birth date is required for nutrition calculations.';
  end if;
  if p_birth_date > current_date or p_birth_date < '1900-01-01' then
    raise exception using errcode = '22023', message = 'Birth date must be between 1900-01-01 and today.';
  end if;
  if p_sex_for_calculation is null or p_sex_for_calculation not in ('male', 'female', 'unspecified') then
    raise exception using errcode = '22023', message = 'Sex for calculation must be male, female, or unspecified.';
  end if;
  if p_height_cm is null or p_height_cm < 100.0 or p_height_cm > 260.0 then
    raise exception using errcode = '22023', message = 'Height must be between 100.0 and 260.0 cm.';
  end if;
  if p_weight_kg is null or p_weight_kg < 30.0 or p_weight_kg > 350.0 then
    raise exception using errcode = '22023', message = 'Weight must be between 30.0 and 350.0 kg.';
  end if;
  if p_activity_level is null or p_activity_level not in ('sedentary', 'light', 'moderate', 'very') then
    raise exception using errcode = '22023', message = 'Activity level must be sedentary, light, moderate, or very.';
  end if;
  if p_workouts_per_week is null or p_workouts_per_week not in ('0-2', '3-5', '6+') then
    raise exception using errcode = '22023', message = 'Workouts per week must be 0-2, 3-5, or 6+.';
  end if;
  if v_nutrition_goal is null or v_nutrition_goal not in ('lose_weight', 'maintain', 'gain_weight') then
    raise exception using errcode = '22023', message = 'Nutrition goal must be lose_weight, maintain, or gain_weight.';
  end if;
  if p_target_weight_kg is not null and (p_target_weight_kg < 30.0 or p_target_weight_kg > 350.0) then
    raise exception using errcode = '22023', message = 'Target weight must be between 30.0 and 350.0 kg.';
  end if;
  if p_weekly_pace_kg is not null and (p_weekly_pace_kg < 0.10 or p_weekly_pace_kg > 1.50) then
    raise exception using errcode = '22023', message = 'Weekly pace must be between 0.10 and 1.50 kg.';
  end if;
  if p_dietary_style is not null and p_dietary_style not in ('balanced', 'vegetarian', 'vegan', 'pescatarian', 'mediterranean', 'high-protein') then
    raise exception using errcode = '22023', message = 'Invalid dietary style.';
  end if;
  if p_meals_per_day is not null and (p_meals_per_day < 1 or p_meals_per_day > 8) then
    raise exception using errcode = '22023', message = 'Meals per day must be between 1 and 8.';
  end if;
  if p_calorie_rollover is null then
    raise exception using errcode = '22023', message = 'Calorie rollover flag is required.';
  end if;

  -- 5. Validate nutrition targets (must be computed by @fitai/nutrition-engine; all 6 targets strictly required)
  if p_target_calories is null or p_target_calories < 1000 or p_target_calories > 6000 then
    raise exception using errcode = '22023', message = 'Target calories are required and must be between 1000 and 6000 kcal.';
  end if;
  if p_target_protein_grams is null or p_target_protein_grams < 30 or p_target_protein_grams > 400 then
    raise exception using errcode = '22023', message = 'Target protein is required and must be between 30 and 400 g.';
  end if;
  if p_target_carbs_grams is null or p_target_carbs_grams < 0 or p_target_carbs_grams > 800 then
    raise exception using errcode = '22023', message = 'Target carbs are required and must be between 0 and 800 g.';
  end if;
  if p_target_fat_grams is null or p_target_fat_grams < 20 or p_target_fat_grams > 300 then
    raise exception using errcode = '22023', message = 'Target fat is required and must be between 20 and 300 g.';
  end if;
  if p_target_fiber_grams is null or p_target_fiber_grams < 10 or p_target_fiber_grams > 100 then
    raise exception using errcode = '22023', message = 'Target fiber is required and must be between 10 and 100 g.';
  end if;
  if p_target_water_ml is null or p_target_water_ml < 1000 or p_target_water_ml > 10000 then
    raise exception using errcode = '22023', message = 'Target water is required and must be between 1000 and 10000 ml.';
  end if;
  if p_calculation_version is null or trim(p_calculation_version) = '' then
    raise exception using errcode = '22023', message = 'Calculation version is required.';
  end if;
  if v_calculated_at is null then
    raise exception using errcode = '22023', message = 'Calculated timestamp is required.';
  end if;

  -- 6. Atomic write 1: Update public.profiles
  update public.profiles
     set age_band = p_age_band,
         sex_for_reference = p_sex_for_reference,
         country_code = p_country_code,
         display_name = coalesce(nullif(trim(p_display_name), ''), display_name)
   where id = actor_id;
  if not found then
    raise exception using errcode = '23503', message = 'The account profile is unavailable.';
  end if;

  -- 7. Atomic write 2: Deactivate previous user_goals & insert active goal
  update public.user_goals
     set is_active = false
   where user_id = actor_id and is_active = true;

  insert into public.user_goals (user_id, goal, is_active)
  values (actor_id, p_goal, true);

  -- 8. Atomic write 3: Upsert public.user_nutrition_profiles
  insert into public.user_nutrition_profiles (
    user_id,
    birth_date,
    sex_for_calculation,
    height_cm,
    weight_kg,
    activity_level,
    workouts_per_week,
    goal,
    target_weight_kg,
    weekly_pace_kg,
    dietary_style,
    meals_per_day,
    calorie_rollover,
    calculation_version,
    calculated_at,
    target_calories,
    target_protein_grams,
    target_carbs_grams,
    target_fat_grams,
    target_fiber_grams,
    target_water_ml
  )
  values (
    actor_id,
    p_birth_date,
    p_sex_for_calculation,
    p_height_cm,
    p_weight_kg,
    p_activity_level,
    p_workouts_per_week,
    v_nutrition_goal,
    p_target_weight_kg,
    p_weekly_pace_kg,
    p_dietary_style,
    p_meals_per_day,
    p_calorie_rollover,
    trim(p_calculation_version),
    v_calculated_at,
    p_target_calories,
    p_target_protein_grams,
    p_target_carbs_grams,
    p_target_fat_grams,
    p_target_fiber_grams,
    p_target_water_ml
  )
  on conflict (user_id) do update
  set birth_date = excluded.birth_date,
      sex_for_calculation = excluded.sex_for_calculation,
      height_cm = excluded.height_cm,
      weight_kg = excluded.weight_kg,
      activity_level = excluded.activity_level,
      workouts_per_week = excluded.workouts_per_week,
      goal = excluded.goal,
      target_weight_kg = excluded.target_weight_kg,
      weekly_pace_kg = excluded.weekly_pace_kg,
      dietary_style = excluded.dietary_style,
      meals_per_day = excluded.meals_per_day,
      calorie_rollover = excluded.calorie_rollover,
      calculation_version = excluded.calculation_version,
      calculated_at = excluded.calculated_at,
      target_calories = excluded.target_calories,
      target_protein_grams = excluded.target_protein_grams,
      target_carbs_grams = excluded.target_carbs_grams,
      target_fat_grams = excluded.target_fat_grams,
      target_fiber_grams = excluded.target_fiber_grams,
      target_water_ml = excluded.target_water_ml;
end;
$$;

-- Security & Permissions: Revoke public/anon access and grant execute only to authenticated users
revoke all on function public.complete_onboarding(
  public.age_band,
  public.goal_type,
  date,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  smallint,
  boolean,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  timestamptz,
  text,
  text,
  text
) from public;

revoke all on function public.complete_onboarding(
  public.age_band,
  public.goal_type,
  date,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  smallint,
  boolean,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  timestamptz,
  text,
  text,
  text
) from anon;

grant execute on function public.complete_onboarding(
  public.age_band,
  public.goal_type,
  date,
  text,
  numeric,
  numeric,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  smallint,
  boolean,
  integer,
  integer,
  integer,
  integer,
  integer,
  integer,
  text,
  timestamptz,
  text,
  text,
  text
) to authenticated;

commit;
