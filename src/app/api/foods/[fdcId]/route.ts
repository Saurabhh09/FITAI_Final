import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSameOrigin } from "@/lib/api/request";
import { createSupabaseServerClient, isSupabaseConfigurationError } from "@/lib/supabase/server";
import { fetchAndNormalizeUsdaFood } from "@/services/food-data/food-detail";
import { loadCachedFood, persistCanonicalFood } from "@/services/food-data/food-repository";
import { FdcConfigurationError, FdcProviderError } from "@/services/food-data/usda-fdc";

export const dynamic = "force-dynamic";

const fdcIdSchema = z.string().regex(/^\d+$/, "fdcId must be a numeric string");

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fdcId: string }> }
) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const { fdcId: rawFdcId } = await context.params;
  const parseResult = fdcIdSchema.safeParse(rawFdcId);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid USDA food identifier." }, { status: 422 });
  }

  const fdcId = parseResult.data;

  let supabase;
  try {
    supabase = await createSupabaseServerClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required to view food details." }, { status: 401 });
    }
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not verify session." }, { status: 503 });
  }

  try {
    // 1. Check local canonical cache first
    const cached = await loadCachedFood(supabase, "USDA_FDC", fdcId);
    if (cached && cached.nutrients.length > 0) {
      return NextResponse.json({ food: cached });
    }

    // 2. Fetch and normalize from USDA FoodData Central
    const canonical = await fetchAndNormalizeUsdaFood(fdcId);

    // 3. Persist to database cache
    try {
      const foodId = await persistCanonicalFood(supabase, canonical);
      canonical.id = foodId;
    } catch (persistErr) {
      console.warn("Could not cache food in database:", persistErr);
    }

    return NextResponse.json({ food: canonical });
  } catch (error) {
    if (error instanceof FdcConfigurationError) {
      return NextResponse.json({ error: "USDA service is not configured on this server." }, { status: 503 });
    }
    if (error instanceof FdcProviderError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Food detail error:", error);
    return NextResponse.json({ error: "Food detail service is temporarily unavailable." }, { status: 502 });
  }
}
