-- FITAI: Secure Server-Side Food Catalog Caching
-- Creates a narrowly scoped SECURITY DEFINER function to allow authenticated users
-- to cache canonical USDA/verified foods without broad catalog mutation permissions.
-- Local migration only. DO NOT apply to hosted database without explicit review.

begin;

create or replace function public.cache_canonical_food(
  p_food jsonb,
  p_nutrients jsonb,
  p_servings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  v_source_system text;
  v_source_food_id text;
  v_source_checksum text;
  v_source_data_type text;
  v_description text;
  v_brand_owner text;
  v_food_category text;
  v_source_url text;
  v_food_id uuid;
  v_elem jsonb;
  v_nutrient_id text;
  v_amount_per_100g numeric;
  v_unit text;
  v_source_basis text;
  v_portion_id text;
  v_serving_desc text;
  v_gram_weight numeric;
  v_is_default boolean;
begin
  -- 1. Strictly verify authenticated session
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  -- 2. Validate p_food payload
  if p_food is null or jsonb_typeof(p_food) != 'object' then
    raise exception using errcode = '22023', message = 'p_food must be a valid JSON object.';
  end if;

  v_source_system := p_food->>'source_system';
  v_source_food_id := trim(coalesce(p_food->>'source_food_id', ''));
  v_source_checksum := trim(coalesce(p_food->>'source_checksum', ''));
  v_source_data_type := trim(coalesce(p_food->>'source_data_type', ''));
  v_description := trim(coalesce(p_food->>'description', ''));
  v_brand_owner := nullif(trim(coalesce(p_food->>'brand_owner', '')), '');
  v_food_category := nullif(trim(coalesce(p_food->>'food_category', '')), '');
  v_source_url := coalesce(nullif(trim(p_food->>'source_url'), ''), 'https://fdc.nal.usda.gov/');

  if v_source_system not in ('USDA_FDC', 'OTHER_VERIFIED') then
    raise exception using errcode = '22023', message = 'Invalid source_system: must be USDA_FDC or OTHER_VERIFIED.';
  end if;

  if char_length(v_source_food_id) < 1 or char_length(v_source_food_id) > 120 then
    raise exception using errcode = '22023', message = 'Invalid source_food_id length.';
  end if;

  if char_length(v_source_checksum) < 8 or char_length(v_source_checksum) > 128 then
    raise exception using errcode = '22023', message = 'Invalid source_checksum length.';
  end if;

  if char_length(v_source_data_type) < 1 or char_length(v_source_data_type) > 80 then
    raise exception using errcode = '22023', message = 'Invalid source_data_type length.';
  end if;

  if char_length(v_description) < 1 or char_length(v_description) > 500 then
    raise exception using errcode = '22023', message = 'Invalid description length.';
  end if;

  if v_source_url not like 'https://%' then
    raise exception using errcode = '22023', message = 'source_url must be an https URL.';
  end if;

  -- 3. Idempotently upsert food record
  insert into public.foods (
    source_system,
    source_food_id,
    source_checksum,
    source_data_type,
    description,
    brand_owner,
    food_category,
    source_url,
    normalization_status
  ) values (
    v_source_system,
    v_source_food_id,
    v_source_checksum,
    v_source_data_type,
    v_description,
    v_brand_owner,
    v_food_category,
    v_source_url,
    'normalized'
  )
  on conflict (source_system, source_food_id, source_checksum)
  do update set
    source_data_type = excluded.source_data_type,
    description = excluded.description,
    brand_owner = excluded.brand_owner,
    food_category = excluded.food_category,
    source_url = excluded.source_url,
    normalization_status = 'normalized'
  returning id into v_food_id;

  -- 4. Idempotently upsert nutrients into public.nutrients and public.food_nutrients
  if p_nutrients is not null and jsonb_typeof(p_nutrients) = 'array' then
    for v_elem in select * from jsonb_array_elements(p_nutrients)
    loop
      v_nutrient_id := trim(coalesce(v_elem->>'nutrient_id', ''));
      v_unit := trim(coalesce(v_elem->>'unit', ''));
      v_source_basis := trim(coalesce(v_elem->>'source_basis', 'per_100g'));

      if v_elem->>'amount_per_100g' is not null and v_nutrient_id <> '' then
        v_amount_per_100g := (v_elem->>'amount_per_100g')::numeric;
        if v_amount_per_100g >= 0 then
          -- Ensure standard nutrient row exists in public.nutrients
          insert into public.nutrients (
            id,
            source_system,
            source_nutrient_id,
            name,
            canonical_unit,
            category
          ) values (
            v_nutrient_id,
            v_source_system,
            v_nutrient_id,
            coalesce(nullif(trim(v_elem->>'name'), ''), v_nutrient_id),
            v_unit,
            nullif(trim(coalesce(v_elem->>'category', '')), '')
          )
          on conflict (id) do update set
            name = coalesce(nullif(excluded.name, ''), nutrients.name),
            canonical_unit = coalesce(nullif(excluded.canonical_unit, ''), nutrients.canonical_unit);

          -- Upsert food_nutrients row
          insert into public.food_nutrients (
            food_id,
            nutrient_id,
            amount_per_100g,
            unit,
            source_basis
          ) values (
            v_food_id,
            v_nutrient_id,
            v_amount_per_100g,
            v_unit,
            v_source_basis
          )
          on conflict (food_id, nutrient_id)
          do update set
            amount_per_100g = excluded.amount_per_100g,
            unit = excluded.unit,
            source_basis = excluded.source_basis;
        end if;
      end if;
    end loop;
  end if;

  -- 5. Idempotently upsert servings into public.food_servings
  if p_servings is not null and jsonb_typeof(p_servings) = 'array' then
    for v_elem in select * from jsonb_array_elements(p_servings)
    loop
      v_portion_id := nullif(trim(coalesce(v_elem->>'source_portion_id', '')), '');
      v_serving_desc := trim(coalesce(v_elem->>'description', 'Serving'));
      v_gram_weight := (v_elem->>'gram_weight')::numeric;
      v_is_default := coalesce((v_elem->>'is_default')::boolean, false);

      if v_gram_weight is not null and v_gram_weight > 0 and char_length(v_serving_desc) between 1 and 250 then
        insert into public.food_servings (
          food_id,
          source_portion_id,
          description,
          gram_weight,
          is_default
        ) values (
          v_food_id,
          v_portion_id,
          v_serving_desc,
          v_gram_weight,
          v_is_default
        )
        on conflict (food_id, source_portion_id)
        do update set
          description = excluded.description,
          gram_weight = excluded.gram_weight,
          is_default = excluded.is_default;
      end if;
    end loop;
  end if;

  return v_food_id;
end;
$$;

-- Security & Permissions
revoke all on function public.cache_canonical_food(jsonb, jsonb, jsonb) from public;
revoke all on function public.cache_canonical_food(jsonb, jsonb, jsonb) from anon;
grant execute on function public.cache_canonical_food(jsonb, jsonb, jsonb) to authenticated;

comment on function public.cache_canonical_food(jsonb, jsonb, jsonb) is
  'Narrowly scoped SECURITY DEFINER RPC allowing authenticated callers to idempotently cache canonical food facts without catalog-wide mutation privileges.';

commit;
