import "server-only";

import { createHash } from "crypto";
import { z } from "zod";
import { FdcConfigurationError, FdcProviderError } from "./usda-fdc";

const FDC_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const REQUEST_TIMEOUT_MS = 8_000;

export type FoodServingOption = {
  sourcePortionId: string;
  description: string;
  gramWeight: number;
  isDefault: boolean;
};

export type CanonicalFoodNutrient = {
  nutrientId: string;
  name: string;
  unit: string;
  amountPer100g: number | null;
  sourceAmount?: number | null;
  sourceUnit?: string | null;
  sourceBasis: string;
};

export type CanonicalFoodDetail = {
  id?: string;
  sourceSystem: "USDA_FDC" | "OTHER_VERIFIED";
  sourceFoodId: string;
  sourceChecksum: string;
  sourceDataType: string;
  description: string;
  brandOwner: string | null;
  foodCategory: string | null;
  sourceUrl: string;
  nutrients: CanonicalFoodNutrient[];
  servings: FoodServingOption[];
};

export const CORE_NUTRIENT_IDS = {
  CALORIES: "1008",
  PROTEIN: "1003",
  CARBS: "1005",
  FAT: "1004",
  FIBER: "1079"
} as const;

export const STANDARD_NUTRIENT_METADATA: Record<string, { name: string; unit: string; category: string }> = {
  "1008": { name: "Energy", unit: "kcal", category: "Energy" },
  "1003": { name: "Protein", unit: "g", category: "Macronutrients" },
  "1005": { name: "Carbohydrate, by difference", unit: "g", category: "Macronutrients" },
  "1004": { name: "Total lipid (fat)", unit: "g", category: "Macronutrients" },
  "1079": { name: "Fiber, total dietary", unit: "g", category: "Macronutrients" }
};

// Alternative USDA legacy nutrient numbers (NDB numbers)
const LEGACY_NUTRIENT_MAP: Record<string, string> = {
  "208": CORE_NUTRIENT_IDS.CALORIES,
  "203": CORE_NUTRIENT_IDS.PROTEIN,
  "205": CORE_NUTRIENT_IDS.CARBS,
  "204": CORE_NUTRIENT_IDS.FAT,
  "291": CORE_NUTRIENT_IDS.FIBER
};

/**
 * Normalizes raw USDA FoodData Central food detail JSON into CanonicalFoodDetail.
 */
export function normalizeUsdaFoodDetail(raw: unknown): CanonicalFoodDetail {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid USDA food payload: expected an object.");
  }

  const data = raw as Record<string, unknown>;
  const fdcId = String(data.fdcId || data.id || "").trim();
  if (!fdcId || !/^\d+$/.test(fdcId)) {
    throw new Error("Invalid USDA food payload: missing or invalid fdcId.");
  }

  const description = String(data.description || "").trim().slice(0, 500) || "Unknown Food";
  const dataType = String(data.dataType || "Foundation").trim().slice(0, 80);
  const brandOwner = typeof data.brandOwner === "string" && data.brandOwner.trim() ? data.brandOwner.trim().slice(0, 250) : null;
  const foodCategory = typeof data.foodCategory === "string"
    ? data.foodCategory.trim().slice(0, 250)
    : typeof data.wweiaFoodCategory === "object" && data.wweiaFoodCategory !== null
    ? String((data.wweiaFoodCategory as { description?: string }).description || "").slice(0, 250)
    : null;

  const isBranded = dataType.toLowerCase().includes("branded");
  const servingSize = typeof data.servingSize === "number" && data.servingSize > 0 ? data.servingSize : null;
  const servingSizeUnit = typeof data.servingSizeUnit === "string" ? data.servingSizeUnit.trim().toLowerCase() : "";

  // Extract raw nutrients list
  const rawNutrients = Array.isArray(data.foodNutrients) ? data.foodNutrients : [];

  // Parse extracted nutrient values mapped by canonical ID (1008, 1003, 1005, 1004, 1079)
  const nutrientValueMap = new Map<string, { amount: number; unit: string; basis: string }>();

  for (const item of rawNutrients) {
    if (typeof item !== "object" || item === null) continue;
    const nObj = item as Record<string, unknown>;
    const nestedNutrient = typeof nObj.nutrient === "object" && nObj.nutrient !== null ? (nObj.nutrient as Record<string, unknown>) : null;

    const nutrientIdRaw = String(nestedNutrient?.id ?? nObj.nutrientId ?? nestedNutrient?.number ?? nObj.nutrientNumber ?? "");
    const canonicalId = STANDARD_NUTRIENT_METADATA[nutrientIdRaw]
      ? nutrientIdRaw
      : LEGACY_NUTRIENT_MAP[nutrientIdRaw] ?? null;

    if (!canonicalId) continue;

    const rawAmount = typeof nObj.amount === "number"
      ? nObj.amount
      : typeof nObj.value === "number"
      ? nObj.value
      : null;

    if (rawAmount === null || !Number.isFinite(rawAmount) || rawAmount < 0) continue;

    const rawUnit = String(nestedNutrient?.unitName ?? nObj.unitName ?? STANDARD_NUTRIENT_METADATA[canonicalId].unit).toLowerCase();

    // Determine basis and per 100g scaling
    let amountPer100g = rawAmount;
    let basis = "per_100g";

    // If branded food reported per serving and servingSize in grams is available
    if (isBranded && servingSize && (servingSizeUnit === "g" || servingSizeUnit === "gram" || servingSizeUnit === "grams" || servingSizeUnit === "ml" || servingSizeUnit === "g/ml")) {
      amountPer100g = (rawAmount / servingSize) * 100;
      basis = `per_serving_${servingSize}g`;
    }

    nutrientValueMap.set(canonicalId, {
      amount: amountPer100g,
      unit: STANDARD_NUTRIENT_METADATA[canonicalId].unit,
      basis
    });
  }

  // Construct canonical nutrients list for all 5 core metrics
  const nutrients: CanonicalFoodNutrient[] = Object.entries(STANDARD_NUTRIENT_METADATA).map(([id, meta]) => {
    const found = nutrientValueMap.get(id);
    return {
      nutrientId: id,
      name: meta.name,
      unit: meta.unit,
      amountPer100g: found !== undefined ? Math.round(found.amount * 10000) / 10000 : null,
      sourceBasis: found ? found.basis : "unavailable"
    };
  });

  // Extract portions & servings
  const servings: FoodServingOption[] = [];

  // 1. Standard 100g baseline option
  servings.push({
    sourcePortionId: "100g",
    description: "100 grams",
    gramWeight: 100,
    isDefault: false
  });

  // 2. Foundation / SR Legacy portions
  if (Array.isArray(data.foodPortions)) {
    for (const p of data.foodPortions) {
      if (typeof p !== "object" || p === null) continue;
      const pObj = p as Record<string, unknown>;
      const gramWeight = typeof pObj.gramWeight === "number" && pObj.gramWeight > 0 ? pObj.gramWeight : null;
      if (!gramWeight) continue;

      const portionId = String(pObj.id || pObj.sequenceNumber || `portion-${servings.length}`);
      const amount = typeof pObj.amount === "number" && pObj.amount > 0 ? pObj.amount : 1;
      const modifier = String(pObj.modifier || pObj.portionDescription || "").trim();
      const unitName = typeof pObj.measureUnit === "object" && pObj.measureUnit !== null
        ? String((pObj.measureUnit as { name?: string }).name || "").trim()
        : typeof pObj.measureUnit === "string"
        ? pObj.measureUnit.trim()
        : "";

      let desc = modifier;
      if (!desc && unitName) desc = `${amount} ${unitName}`;
      if (!desc) desc = `1 serving (${Math.round(gramWeight)}g)`;
      else if (!desc.includes(`${Math.round(gramWeight)}g`) && !desc.includes(`${gramWeight}g`)) {
        desc = `${desc} (${Math.round(gramWeight)}g)`;
      }

      servings.push({
        sourcePortionId: portionId,
        description: desc.slice(0, 250),
        gramWeight: Math.round(gramWeight * 100) / 100,
        isDefault: servings.length === 1 // Make the first non-100g serving default if available
      });
    }
  }

  // 3. Branded household serving
  if (isBranded && servingSize && (servingSizeUnit === "g" || servingSizeUnit === "gram" || servingSizeUnit === "grams" || servingSizeUnit === "ml")) {
    const householdDesc = typeof data.householdServingFullText === "string" && data.householdServingFullText.trim()
      ? data.householdServingFullText.trim()
      : `1 serving (${servingSize}${servingSizeUnit})`;

    servings.push({
      sourcePortionId: "branded-serving",
      description: householdDesc.slice(0, 250),
      gramWeight: Math.round(servingSize * 100) / 100,
      isDefault: true
    });
  }

  // Ensure at least one default serving
  if (!servings.some((s) => s.isDefault) && servings.length > 0) {
    servings[0].isDefault = true;
  }

  // Deterministic checksum of food ID and nutrient contents
  const checksumPayload = JSON.stringify({ fdcId, description, nutrients, servings });
  const sourceChecksum = createHash("sha256").update(checksumPayload).digest("hex").slice(0, 32);

  return {
    sourceSystem: "USDA_FDC",
    sourceFoodId: fdcId,
    sourceChecksum,
    sourceDataType: dataType,
    description,
    brandOwner,
    foodCategory,
    sourceUrl: `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`,
    nutrients,
    servings
  };
}

/**
 * Fetches raw food details from USDA FoodData Central and normalizes it.
 */
export async function fetchAndNormalizeUsdaFood(fdcId: string): Promise<CanonicalFoodDetail> {
  const apiKey = process.env.USDA_FDC_API_KEY?.trim();
  if (!apiKey) throw new FdcConfigurationError();

  const url = new URL(`${FDC_API_BASE}/food/${encodeURIComponent(fdcId)}`);
  url.searchParams.set("api_key", apiKey);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new FdcProviderError("timeout", 504, "USDA FoodData Central did not respond in time.");
    }
    throw new FdcProviderError("upstream", 502, "Could not contact USDA FoodData Central.");
  }

  if (response.status === 404) {
    throw new FdcProviderError("invalid-response", 404, "Food item not found in USDA database.");
  }
  if (response.status === 429) {
    throw new FdcProviderError("rate-limited", 429, "USDA FoodData Central rate limit reached.");
  }
  if (!response.ok) {
    throw new FdcProviderError("upstream", 502, `USDA FoodData Central returned HTTP ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new FdcProviderError("invalid-response", 502, "USDA FoodData Central returned invalid JSON.");
  }

  try {
    return normalizeUsdaFoodDetail(payload);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unrecognized USDA food response.";
    throw new FdcProviderError("invalid-response", 502, msg);
  }
}
