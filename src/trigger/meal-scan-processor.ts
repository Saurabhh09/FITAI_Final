import { logger, task } from "@trigger.dev/sdk";
import { createClient } from "@supabase/supabase-js";
import { buildImageKitTransformedUrl } from "./imagekit-transform";

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

export type MealScanPayload = {
  scanId: string;
  imageUrl: string;
  userId: string;
  date?: string;
};

/**
 * Trigger.dev task to process meal scans with Google Gemini Vision.
 */
export const mealScanTask = task({
  id: "meal-scan-processor",
  maxDuration: 300,
  run: async (payload: MealScanPayload, { ctx }) => {
    logger.log("Initiating meal scan processing", {
      scanId: payload.scanId,
      userId: payload.userId,
      imageUrl: payload.imageUrl,
    });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      "";

    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

    // 1. Mark scan as processing in Supabase
    if (supabase && payload.scanId) {
      try {
        await supabase
          .from("meal_scans")
          .update({
            status: "processing",
            trigger_run_id: ctx.run.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.scanId);
      } catch (err: any) {
        logger.warn("Could not update meal_scans to processing state", { error: err.message });
      }
    }

    try {
      // 2. Fetch the downscaled image from ImageKit CDN using real-time URL transformation
      const transformedUrl = buildImageKitTransformedUrl(payload.imageUrl, {
        width: 1024,
        height: 1024,
        cropMode: "c-at_max",
        quality: 85,
      });

      logger.log("Fetching downscaled image from ImageKit CDN for vision model", {
        originalUrl: payload.imageUrl,
        transformedUrl,
      });

      const imgRes = await fetch(transformedUrl);
      if (!imgRes.ok) {
        throw new Error(`Failed to download meal image from CDN: HTTP ${imgRes.status}`);
      }
      const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
      const buffer = await imgRes.arrayBuffer();
      const base64Data = Buffer.from(buffer).toString("base64");

      // 3. Call Google Gemini Vision API
      const geminiApiKey =
        process.env.GEMINI_APIK_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.FITAI_AI_API_KEY;

      if (!geminiApiKey) {
        throw new Error("Missing GEMINI_API_KEY in environment variables.");
      }

      const prompt = `You are an expert AI clinical nutritionist and food recognition system.
Analyze the provided meal image carefully.
1. Identify all recognizable food and drink items in the meal.
2. Estimate the portion size (in grams) for each item based on visual perspective and standard serving sizes.
3. Calculate the nutritional values: Calories (kcal), Protein (g), Carbohydrates (g), Total Fat (g), and Dietary Fiber (g).
4. Provide a descriptive title for the meal and a brief 1-2 sentence nutrition summary.
5. If the image does not show food, set is_food to false, meal_name to "Unrecognized / Non-food", confidence_score to 0, and items to [].

Respond ONLY with a JSON object adhering to this exact format:
{
  "is_food": true,
  "meal_name": "Grilled Salmon with Asparagus and Rice",
  "summary": "A balanced, high-protein meal rich in omega-3 fatty acids and complex carbohydrates.",
  "confidence_score": 0.95,
  "total_calories": 520,
  "total_protein_g": 42,
  "total_carbs_g": 38,
  "total_fat_g": 22,
  "total_fiber_g": 5,
  "items": [
    {
      "name": "Grilled Atlantic Salmon",
      "portion": "1 fillet (approx. 180g)",
      "weight_g": 180,
      "calories": 360,
      "protein_g": 36,
      "carbs_g": 0,
      "fat_g": 22,
      "fiber_g": 0
    },
    {
      "name": "Steamed Asparagus",
      "portion": "1 cup (approx. 100g)",
      "weight_g": 100,
      "calories": 25,
      "protein_g": 3,
      "carbs_g": 4,
      "fat_g": 0,
      "fiber_g": 2
    },
    {
      "name": "Cooked Brown Rice",
      "portion": "1/2 cup (approx. 95g)",
      "weight_g": 95,
      "calories": 135,
      "protein_g": 3,
      "carbs_g": 34,
      "fat_g": 0,
      "fiber_g": 3
    }
  ]
}`;

      // Models to try in order of preference
      const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
      let analysisJson: MealAnalysisResult | null = null;
      let lastError: string | null = null;

      for (const model of models) {
        try {
          logger.log(`Calling Gemini Vision model: ${model}`);
          const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
          const geminiRes = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    {
                      inline_data: {
                        mime_type: mimeType.split(";")[0].trim(),
                        data: base64Data,
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
          });

          const geminiData = await geminiRes.json();
          if (!geminiRes.ok) {
            lastError = geminiData.error?.message || `HTTP ${geminiRes.status}`;
            logger.warn(`Model ${model} returned error`, { error: lastError });
            continue;
          }

          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!rawText) {
            lastError = "Gemini returned empty response text.";
            continue;
          }

          analysisJson = JSON.parse(rawText) as MealAnalysisResult;
          break;
        } catch (err: any) {
          lastError = err.message;
          logger.warn(`Model ${model} threw error`, { error: err.message });
        }
      }

      if (!analysisJson) {
        throw new Error(`Failed to analyze meal with Gemini Vision: ${lastError}`);
      }

      const isNotFood =
        analysisJson.is_food === false ||
        analysisJson.confidence_score === 0 ||
        analysisJson.meal_name.toLowerCase().includes("non-food") ||
        analysisJson.meal_name.toLowerCase().includes("unrecognized");

      if (isNotFood) {
        analysisJson.is_food = false;
        logger.warn("Non-food image detected by Gemini Vision; aborting macro diary save", {
          scanId: payload.scanId,
          mealName: analysisJson.meal_name,
        });
      } else {
        analysisJson.is_food = true;
        logger.log("Meal analysis completed successfully", {
          mealName: analysisJson.meal_name,
          totalCalories: analysisJson.total_calories,
          itemsCount: analysisJson.items?.length,
        });
      }

      // 4. Update Supabase record with completed status and result
      if (supabase && payload.scanId) {
        try {
          const updatePayload = isNotFood
            ? {
                status: "failed" as const,
                error_code: "NOT_FOOD",
                error_message: "No edible food detected in image",
                analysis_result: analysisJson,
                updated_at: new Date().toISOString(),
              }
            : {
                status: "completed" as const,
                error_code: null,
                error_message: null,
                analysis_result: analysisJson,
                updated_at: new Date().toISOString(),
              };

          const { error: updateError } = await supabase
            .from("meal_scans")
            .update(updatePayload)
            .eq("id", payload.scanId);

          if (updateError) {
            logger.error("Failed to update meal_scans with result", {
              error: updateError.message,
            });
          }
        } catch (dbErr: any) {
          logger.error("Database update error", { error: dbErr.message });
        }
      }

      return {
        ok: true,
        scanId: payload.scanId,
        analysis: analysisJson,
      };
    } catch (error: any) {
      logger.error("Meal scan processor encountered a fatal error", { error: error.message });

      if (supabase && payload.scanId) {
        try {
          await supabase
            .from("meal_scans")
            .update({
              status: "failed",
              error_message: error.message,
              updated_at: new Date().toISOString(),
            })
            .eq("id", payload.scanId);
        } catch {}
      }

      throw error;
    }
  },
});
