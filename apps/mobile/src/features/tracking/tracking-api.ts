import { getMobileApiUrl } from "../../lib/api-config";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number };

export type WaterLogResponse = {
  ok: boolean;
  date: string;
  volumeMl: number;
};

export type WeightEntryResponse = {
  ok: boolean;
  entry: {
    id: string;
    weight_kg: number;
    recorded_at: string;
  };
};

function authHeaders(accessToken: string): HeadersInit {
  return {
    "Authorization": `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

export async function logWaterApi(
  date: string,
  volumeMl: number,
  accessToken: string
): Promise<ApiResult<WaterLogResponse>> {
  if (!accessToken) {
    return { ok: false, error: "Authentication required.", status: 401 };
  }

  const baseUrl = getMobileApiUrl();
  const url = `${baseUrl}/api/nutrition/water`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ date, volumeMl }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `Failed to log water (status ${res.status}).`,
        status: res.status,
      };
    }

    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to hydration service.";
    return { ok: false, error: msg };
  }
}

export async function logWeightApi(
  weightKg: number,
  recordedAt: string | undefined,
  accessToken: string,
  note?: string
): Promise<ApiResult<WeightEntryResponse>> {
  if (!accessToken) {
    return { ok: false, error: "Authentication required.", status: 401 };
  }

  const baseUrl = getMobileApiUrl();
  const url = `${baseUrl}/api/nutrition/weight`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ weightKg, recordedAt, note }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        ok: false,
        error: data?.error || `Failed to log weight (status ${res.status}).`,
        status: res.status,
      };
    }

    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to connect to weight service.";
    return { ok: false, error: msg };
  }
}
