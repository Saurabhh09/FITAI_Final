import { getMobileApiUrl } from "../../lib/api-config";
import type {
  BackendMealType,
  CanonicalFoodDetail,
  FoodSearchResult
} from "./food-domain";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export type LogMealItemPayload = {
  date: string;
  mealType: BackendMealType;
  foodId?: string;
  fdcId?: string;
  quickFoodId?: string;
  quantityGrams: number;
  nameSnapshot: string;
  servingDescription?: string;
};

export type LoggedItemResponse = {
  id: string;
  mealId: string;
  foodId: string;
  name: string;
  serving: string;
  weightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  mealType: string;
};

function authHeaders(accessToken: string): HeadersInit {
  return {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

export async function searchFoodsApi(
  query: string,
  accessToken: string,
  limit = 15
): Promise<ApiResult<FoodSearchResult[]>> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Search query must be at least 2 characters." };
  }

  const baseUrl = getMobileApiUrl();
  const url = `${baseUrl}/api/foods/search?q=${encodeURIComponent(trimmed)}&limit=${limit}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: authHeaders(accessToken),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `Search failed with status ${res.status}.`,
        status: res.status,
      };
    }

    return {
      ok: true,
      data: Array.isArray(data?.foods) ? data.foods : [],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to food search service.";
    return { ok: false, error: msg };
  }
}

export async function fetchFoodDetailApi(
  fdcId: string,
  accessToken: string
): Promise<ApiResult<CanonicalFoodDetail>> {
  const trimmed = fdcId.trim();
  if (!trimmed) {
    return { ok: false, error: "Food identifier is required." };
  }

  const baseUrl = getMobileApiUrl();
  const url = `${baseUrl}/api/foods/${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: authHeaders(accessToken),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `Could not retrieve food details (status ${res.status}).`,
        status: res.status,
      };
    }

    if (!data?.food) {
      return { ok: false, error: "Food details not found in response." };
    }

    return { ok: true, data: data.food };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to food detail service.";
    return { ok: false, error: msg };
  }
}

export async function logMealItemApi(
  payload: LogMealItemPayload,
  accessToken: string
): Promise<ApiResult<LoggedItemResponse>> {
  const baseUrl = getMobileApiUrl();
  const url = `${baseUrl}/api/nutrition/meals/item`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `Failed to log meal item (status ${res.status}).`,
        status: res.status,
      };
    }

    if (!data?.item) {
      return { ok: false, error: "Invalid response from meal logging service." };
    }

    return { ok: true, data: data.item };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to meal logging service.";
    return { ok: false, error: msg };
  }
}

export async function deleteMealItemApi(
  itemId: string,
  accessToken: string
): Promise<ApiResult<string>> {
  const trimmed = itemId.trim();
  if (!trimmed) {
    return { ok: false, error: "Item ID is required." };
  }

  const baseUrl = getMobileApiUrl();
  const url = `${baseUrl}/api/nutrition/meals/item/${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: authHeaders(accessToken),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `Failed to delete meal item (status ${res.status}).`,
        status: res.status,
      };
    }

    return { ok: true, data: data?.deletedId || trimmed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to meal delete service.";
    return { ok: false, error: msg };
  }
}
