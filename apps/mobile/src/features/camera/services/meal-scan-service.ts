import { getSupabase } from "../../../lib/supabase";
import {
  buildImageKitTransformedUrl,
  type ImageKitTransformOptions,
} from "./imagekit-transform";

export { buildImageKitTransformedUrl, type ImageKitTransformOptions };

export type MealAnalysisItem = {
  name: string;
  portion: string;
  weight_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
};

export type MealAnalysisResult = {
  is_food?: boolean;
  meal_name: string;
  summary: string;
  confidence_score: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  total_fiber_g: number;
  items: MealAnalysisItem[];
};

export type MealScanRecord = {
  id: string;
  user_id: string;
  image_url: string;
  image_kit_file_id?: string;
  status: "pending" | "processing" | "completed" | "failed" | "rejected_not_food";
  analysis_result?: MealAnalysisResult;
  error_message?: string;
  trigger_run_id?: string;
  created_at: string;
  updated_at: string;
};

export type ScanStep =
  | "idle"
  | "capturing"
  | "checking_food"
  | "not_food"
  | "uploading"
  | "saving_pending"
  | "analyzing"
  | "completed"
  | "error";

/**
 * Universal cross-environment base64 encoder for React Native.
 */
export function toBase64(str: string): string {
  if (typeof btoa === "function") {
    return btoa(str);
  }
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  for (
    let block = 0, charCode = 0, i = 0, map = chars;
    str.charAt(i | 0) || ((map = "="), i % 1);
    output += map.charAt(63 & (block >> (8 - (i % 1) * 8)))
  ) {
    charCode = str.charCodeAt((i += 3 / 4));
    if (charCode > 0xff) {
      throw new Error("'btoa' failed: String contains characters outside Latin1 range.");
    }
    block = (block << 8) | charCode;
  }
  return output;
}

/**
 * Uploads a food photo to ImageKit.
 */
export async function uploadMealImageToImageKit(
  base64Data: string,
  fileName?: string
): Promise<{ ok: boolean; url?: string; fileId?: string; error?: string }> {
  try {
    const secretKey =
      process.env.EXPO_PUBLIC_IMAGE_KIT_SECRET_KEY ||
      process.env.IMAGE_KIT_SECRET_KEY ||
      "";

    if (!secretKey) {
      return { ok: false, error: "ImageKit secret key is not configured." };
    }

    const cleanBase64 = base64Data.includes("base64,")
      ? base64Data.split("base64,")[1]
      : base64Data;

    const actualFileName = fileName || `meal_scan_${Date.now()}.jpg`;

    const formData = new FormData();
    formData.append("file", cleanBase64);
    formData.append("fileName", actualFileName);
    formData.append("folder", "/meal_scans");
    formData.append("useUniqueFileName", "true");

    const authHeader = `Basic ${toBase64(`${secretKey}:`)}`;

    const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        Authorization: authHeader,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      return {
        ok: false,
        error: data.message || `ImageKit upload failed with HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      url: data.url,
      fileId: data.fileId,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to upload image to ImageKit." };
  }
}

/**
 * Saves a meal scan to Supabase with status = 'pending'.
 */
export async function saveMealScanPending(params: {
  userId: string;
  imageUrl: string;
  fileId?: string;
}): Promise<{ ok: boolean; scanId: string; error?: string }> {
  try {
    const supabase = getSupabase();
    const tempId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const { data, error } = await supabase
      .from("meal_scans")
      .insert({
        user_id: params.userId,
        image_url: params.imageUrl,
        image_kit_file_id: params.fileId,
        status: "pending",
      })
      .select("id")
      .maybeSingle();

    if (error) {
      // Table might not be migrated yet or offline; fallback to client id
      return {
        ok: true,
        scanId: tempId,
        error: error.message,
      };
    }

    return {
      ok: true,
      scanId: data?.id || tempId,
    };
  } catch (err: any) {
    return {
      ok: true,
      scanId: `scan_${Date.now()}`,
      error: err.message,
    };
  }
}

/**
 * Triggers the Trigger.dev meal scan processor task.
 */
export async function triggerMealScanTask(params: {
  scanId: string;
  imageUrl: string;
  userId: string;
  date?: string;
}): Promise<{ ok: boolean; runId?: string; error?: string }> {
  try {
    const secretKey =
      process.env.EXPO_PUBLIC_TRIGGER_DEV_SECRET_KEY ||
      process.env.TRIGGER_DEV_SECRET_KEY ||
      "";

    if (!secretKey) {
      return { ok: false, error: "Trigger.dev secret key not configured." };
    }

    const response = await fetch("https://api.trigger.dev/api/v1/tasks/meal-scan-processor/trigger", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: {
          scanId: params.scanId,
          imageUrl: params.imageUrl,
          userId: params.userId,
          date: params.date || new Date().toISOString().split("T")[0],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.id) {
      return {
        ok: false,
        error: data.message || `Trigger.dev task trigger failed (HTTP ${response.status})`,
      };
    }

    return {
      ok: true,
      runId: data.id,
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to trigger background task." };
  }
}

/**
 * Direct Gemini Vision analysis fallback in case background task worker is offline.
 */
export async function analyzeMealDirectWithGemini(
  base64Image: string,
  timeoutMs = 30000
): Promise<{ ok: boolean; analysis?: MealAnalysisResult; error?: string }> {
  try {
    const apiKey =
      process.env.EXPO_PUBLIC_GEMINI_APIK_KEY ||
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      process.env.GEMINI_APIK_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.FITAI_AI_API_KEY ||
      "";

    if (!apiKey) {
      return { ok: false, error: "Gemini API key is not configured." };
    }

    const cleanBase64 = base64Image.includes("base64,")
      ? base64Image.split("base64,")[1]
      : base64Image;

    const prompt = `You are an expert AI clinical nutritionist.
Analyze the meal in the image thoroughly:
1. Identify all visible foods and drinks.
2. Estimate portion size in grams.
3. Calculate Calories (kcal), Protein (g), Carbohydrates (g), Total Fat (g), and Fiber (g).
4. Provide a descriptive title and 1-2 sentence nutrition summary.
5. If no food is detected, set meal_name to "Unrecognized / Non-food" and confidence_score to 0.

Respond ONLY with valid JSON:
{
  "meal_name": "string",
  "summary": "string",
  "confidence_score": 0.95,
  "total_calories": 500,
  "total_protein_g": 35,
  "total_carbs_g": 45,
  "total_fat_g": 18,
  "total_fiber_g": 6,
  "items": [
    {
      "name": "string",
      "portion": "string",
      "weight_g": 150,
      "calories": 250,
      "protein_g": 25,
      "carbs_g": 10,
      "fat_g": 8,
      "fiber_g": 2
    }
  ]
}`;

    const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
    let resultJson: MealAnalysisResult | null = null;
    let lastErr = "";

    for (const model of models) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: cleanBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                response_mime_type: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );

        const data = await res.json();
        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          resultJson = JSON.parse(data.candidates[0].content.parts[0].text);
          break;
        } else {
          lastErr = data.error?.message || `HTTP ${res.status}`;
        }
      } catch (err: any) {
        const isAbort =
          err.name === "AbortError" ||
          (err.message && err.message.toLowerCase().includes("cancel")) ||
          (err.message && err.message.toLowerCase().includes("abort"));
        lastErr = isAbort ? "Meal analysis took too long. Please try again." : err.message;
      } finally {
        clearTimeout(timeoutId);
      }
    }

    if (!resultJson) {
      return { ok: false, error: lastErr || "Failed to analyze meal." };
    }

    return { ok: true, analysis: resultJson };
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to connect to AI vision." };
  }
}

/**
 * Polls Supabase for the scan completion or runs fallback if timeout.
 */
export async function pollMealScanResult(
  scanId: string,
  base64Fallback?: string,
  maxAttempts = 18,
  intervalMs = 1200
): Promise<{ ok: boolean; analysis?: MealAnalysisResult; error?: string }> {
  const supabase = getSupabase();

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const { data, error } = await supabase
        .from("meal_scans")
        .select("status, analysis_result, error_code, error_message")
        .eq("id", scanId)
        .maybeSingle();

      if (!error && data) {
        if (data.status === "completed" && data.analysis_result) {
          return { ok: true, analysis: data.analysis_result };
        }
        if (data.status === "rejected_not_food" || data.error_code === "NOT_FOOD") {
          return { ok: false, error: "No food detected in this image." };
        }
        if (data.status === "failed") {
          return { ok: false, error: data.error_message || "Meal analysis failed." };
        }
      }
    } catch {
      // Continue polling
    }
  }

  // If Trigger.dev or database polling timed out and we have the base64, run direct Gemini fallback
  if (base64Fallback) {
    return await analyzeMealDirectWithGemini(base64Fallback, 15000);
  }

  return { ok: false, error: "Meal analysis timed out. Please try again." };
}

/**
 * Updates a meal scan in Supabase with completed status and analysis.
 */
export async function updateMealScanCompleted(params: {
  scanId: string;
  analysis: MealAnalysisResult;
}): Promise<boolean> {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("meal_scans")
      .update({
        status: "completed",
        analysis_result: params.analysis,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.scanId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * End-to-end meal scanning pipeline:
 * 1. Uploads photo to ImageKit CDN (~1-2s)
 * 2. Saves pending record to Supabase (~0.3s)
 * 3. Launches Trigger.dev background worker (~0.3s)
 * 4. Polls Supabase directly for completed macros (resolves in ~10-12s total)
 * 5. Direct fallback with timeout if worker is offline
 */
export async function executeMealScanPipeline(params: {
  base64Image: string;
  userId: string;
  onStepChange?: (step: string) => void;
}): Promise<{
  ok: boolean;
  analysis?: MealAnalysisResult;
  scanId?: string;
  imageUrl?: string;
  error?: string;
}> {
  try {
    // Step 1: Upload to ImageKit
    params.onStepChange?.("Saving image to ImageKit...");
    const uploadRes = await uploadMealImageToImageKit(params.base64Image);
    if (!uploadRes.ok || !uploadRes.url) {
      return { ok: false, error: uploadRes.error || "Failed to upload image to ImageKit." };
    }

    // Step 1B: Downscale Image via ImageKit Real-time URL Transformation (w-1024, h-1024, c-at_max)
    // Preserves full meal context and aspect ratio while optimizing resolution and bandwidth for AI vision
    const downscaledUrl = buildImageKitTransformedUrl(uploadRes.url, {
      width: 1024,
      height: 1024,
      cropMode: "c-at_max",
      quality: 85,
    });

    // Step 2: Record in Supabase (status = 'pending')
    params.onStepChange?.("Recording scan in database...");
    const pendingRes = await saveMealScanPending({
      userId: params.userId,
      imageUrl: downscaledUrl,
      fileId: uploadRes.fileId,
    });
    const scanId = pendingRes.scanId;

    // Step 3: Trigger background worker with downscaled ImageKit URL
    params.onStepChange?.("Analyzing macros with AI...");
    const triggerRes = await triggerMealScanTask({
      scanId,
      imageUrl: downscaledUrl,
      userId: params.userId,
    });

    // Step 4: If Trigger.dev was triggered successfully, poll Supabase (checks for ~7 seconds)
    if (triggerRes.ok) {
      const pollRes = await pollMealScanResult(scanId, undefined, 6, 1200);
      if (pollRes.ok && pollRes.analysis) {
        return {
          ok: true,
          analysis: pollRes.analysis,
          scanId,
          imageUrl: downscaledUrl,
        };
      }
    }

    // Step 5: Direct Gemini Vision fallback if Trigger.dev was offline or timed out
    params.onStepChange?.("Analyzing macros with AI...");
    const aiRes = await analyzeMealDirectWithGemini(params.base64Image, 30000);
    if (aiRes.ok && aiRes.analysis) {
      await updateMealScanCompleted({
        scanId,
        analysis: aiRes.analysis,
      });
      return {
        ok: true,
        analysis: aiRes.analysis,
        scanId,
        imageUrl: downscaledUrl,
      };
    }

    return {
      ok: false,
      error: aiRes.error || "Meal analysis timed out. Please try again.",
    };
  } catch (err: any) {
    return { ok: false, error: err.message || "An unexpected error occurred during meal scanning." };
  }
}

