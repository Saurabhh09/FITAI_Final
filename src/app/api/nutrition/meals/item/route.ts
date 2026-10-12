import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSameOrigin, readJson, jsonReadError } from "@/lib/api/request";
import { createSupabaseServerClient, isSupabaseConfigurationError } from "@/lib/supabase/server";
import { calculateNutritionTotals, type NutrientFact } from "@/features/nutrition/domain";
import { fetchAndNormalizeUsdaFood, STANDARD_NUTRIENT_METADATA } from "@/services/food-data/food-detail";
import { loadCachedFood, persistCanonicalFood } from "@/services/food-data/food-repository";
import { resolveOrPersistQuickFood } from "@/services/food-data/quick-foods";

export const dynamic = "force-dynamic";

const VALID_MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack", "other"] as const;

const logMealItemSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  mealType: z.string().transform((s) => {
    const lower = s.toLowerCase().trim();
    if (lower === "snacks") return "snack";
    return lower;
  }).pipe(z.enum(VALID_MEAL_TYPES)),
  foodId: z.string().uuid().optional(),
  fdcId: z.string().regex(/^\d+$/).optional(),
  quickFoodId: z.string().min(1).max(80).optional(),
  quantityGrams: z.number().positive().max(5000, "Quantity must be 5000g or less"),
  nameSnapshot: z.string().trim().min(1).max(300),
  servingDescription: z.string().trim().max(250).optional()
}).refine((data) => data.foodId || data.fdcId || data.quickFoodId, {
  message: "Either foodId, fdcId, or quickFoodId must be provided."
});

const deleteMealItemSchema = z.object({
  id: z.string().uuid("Invalid meal item ID.")
});

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJson(request);
  if (!body.ok) return jsonReadError(body);

  const parseResult = logMealItemSchema.safeParse(body.value);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || "Invalid meal logging payload." }, { status: 422 });
  }

  const { date, mealType, foodId: initialFoodId, fdcId, quickFoodId, quantityGrams, nameSnapshot, servingDescription } = parseResult.data;

  let supabase;
  let user;
  try {
    supabase = await createSupabaseServerClient(request);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Authentication required to log meals." }, { status: 401 });
    }
    user = authUser;
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not verify session." }, { status: 503 });
  }

  try {
    let resolvedFoodId = initialFoodId;

    // If quickFoodId was provided and no foodId, resolve verified quick food
    if (!resolvedFoodId && quickFoodId) {
      resolvedFoodId = await resolveOrPersistQuickFood(supabase, quickFoodId);
    }

    // If fdcId was provided and no foodId, resolve or fetch/cache USDA food
    if (!resolvedFoodId && fdcId) {
      const cached = await loadCachedFood(supabase, "USDA_FDC", fdcId);
      if (cached?.id) {
        resolvedFoodId = cached.id;
      } else {
        const canonical = await fetchAndNormalizeUsdaFood(fdcId);
        resolvedFoodId = await persistCanonicalFood(supabase, canonical);
      }
    }

    if (!resolvedFoodId) {
      return NextResponse.json({ error: "Could not resolve food record." }, { status: 422 });
    }

    // 1. Find or create the meal container for (user_id, logged_for, meal_type)
    let mealId: string;
    const { data: existingMeal } = await supabase
      .from("meals")
      .select("id")
      .eq("user_id", user.id)
      .eq("logged_for", date)
      .eq("meal_type", mealType)
      .maybeSingle();

    if (existingMeal?.id) {
      mealId = existingMeal.id;
    } else {
      const { data: newMeal, error: mealError } = await supabase
        .from("meals")
        .insert({
          user_id: user.id,
          logged_for: date,
          meal_type: mealType
        })
        .select("id")
        .single();

      if (mealError || !newMeal) {
        console.error("Meal container insert failed:", mealError);
        return NextResponse.json({ error: "Could not create meal log." }, { status: 500 });
      }
      mealId = newMeal.id;
    }

    // 2. Insert meal_items row
    const { data: mealItem, error: itemError } = await supabase
      .from("meal_items")
      .insert({
        meal_id: mealId,
        user_id: user.id,
        food_id: resolvedFoodId,
        item_name_snapshot: nameSnapshot,
        quantity_grams: quantityGrams
      })
      .select("id, created_at")
      .single();

    if (itemError || !mealItem) {
      console.error("Meal item insert failed:", itemError);
      return NextResponse.json({ error: "Could not save meal item." }, { status: 500 });
    }

    // 3. Query food_nutrients to compute verified nutrition values
    const { data: nutrientsData } = await supabase
      .from("food_nutrients")
      .select("nutrient_id, amount_per_100g, unit")
      .eq("food_id", resolvedFoodId);

    const facts: NutrientFact[] = (nutrientsData ?? []).map((fn: { nutrient_id: string; amount_per_100g: number; unit: string }) => ({
      nutrientId: fn.nutrient_id,
      name: STANDARD_NUTRIENT_METADATA[fn.nutrient_id]?.name || fn.nutrient_id,
      unit: fn.unit,
      amountPer100g: Number(fn.amount_per_100g)
    }));

    const totals = calculateNutritionTotals([{
      foodId: resolvedFoodId,
      weightGrams: quantityGrams,
      nutrients: facts
    }]);

    const displayMealType =
      mealType === "breakfast" ? "Breakfast" :
      mealType === "lunch" ? "Lunch" :
      mealType === "dinner" ? "Dinner" :
      mealType === "snack" ? "Snacks" : "Other";

    return NextResponse.json({
      ok: true,
      item: {
        id: mealItem.id,
        mealId,
        foodId: resolvedFoodId,
        name: nameSnapshot,
        serving: servingDescription || `${Math.round(quantityGrams)}g`,
        weightGrams: quantityGrams,
        calories: Math.round(totals["1008"]?.amount ?? 0),
        protein: Math.round((totals["1003"]?.amount ?? 0) * 10) / 10,
        carbs: Math.round((totals["1005"]?.amount ?? 0) * 10) / 10,
        fat: Math.round((totals["1004"]?.amount ?? 0) * 10) / 10,
        fiber: Math.round((totals["1079"]?.amount ?? 0) * 10) / 10,
        mealType: displayMealType
      }
    });
  } catch (error) {
    console.error("Meal item logging error:", error);
    return NextResponse.json({ error: "Meal logging service unavailable." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  let itemId: string | null = request.nextUrl.searchParams.get("id");
  if (!itemId) {
    const body = await readJson(request);
    if (body.ok && typeof body.value === "object" && body.value !== null) {
      itemId = (body.value as { id?: string }).id || null;
    }
  }

  const parseResult = deleteMealItemSchema.safeParse({ id: itemId });
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid meal item ID." }, { status: 422 });
  }

  let supabase;
  let user;
  try {
    supabase = await createSupabaseServerClient(request);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    user = authUser;
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not verify session." }, { status: 503 });
  }

  try {
    const { error: deleteError } = await supabase
      .from("meal_items")
      .delete()
      .eq("id", parseResult.data.id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Delete meal item failed:", deleteError);
      return NextResponse.json({ error: "Could not delete meal item." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deletedId: parseResult.data.id });
  } catch (error) {
    console.error("Delete meal item error:", error);
    return NextResponse.json({ error: "Meal item service unavailable." }, { status: 503 });
  }
}
