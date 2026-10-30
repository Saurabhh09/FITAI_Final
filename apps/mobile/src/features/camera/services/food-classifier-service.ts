export type FoodClassificationResult = {
  isFood: boolean;
  detectedItem: string;
  confidence: number;
};

/**
 * Parses Gemini response to determine if image contains food.
 */
export function parseFoodClassificationResponse(rawJsonText: string): FoodClassificationResult {
  try {
    const cleaned = rawJsonText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);

    const isFood = Boolean(parsed.is_food ?? parsed.isFood);
    const detectedItem = String(parsed.detected_item || parsed.item_name || (isFood ? "Food Item" : "Non-food item"));
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : isFood ? 0.9 : 0.1;

    return {
      isFood,
      detectedItem,
      confidence,
    };
  } catch {
    // If JSON parsing fails, check for presence of keywords
    const lower = rawJsonText.toLowerCase();
    if (
      lower.includes("is_food: false") ||
      lower.includes('"is_food": false') ||
      lower.includes('"is_food":false') ||
      lower.includes("not food") ||
      lower.includes("no food") ||
      lower.includes("non-food")
    ) {
      return {
        isFood: false,
        detectedItem: "Non-food object",
        confidence: 0.2,
      };
    }
    // Default to true so we don't accidentally block user if JSON format was quirky
    return {
      isFood: true,
      detectedItem: "Recognized food",
      confidence: 0.7,
    };
  }
}

/**
 * Pre-flight vision gate that rapidly checks if the image contains food
 * before uploading to ImageKit CDN or running the Trigger.dev background task.
 */
export async function checkIsFoodImage(
  base64Image: string,
  timeoutMs = 7000
): Promise<{ ok: boolean; isFood: boolean; detectedItem?: string; error?: string }> {
  try {
    const apiKey =
      process.env.EXPO_PUBLIC_GEMINI_APIK_KEY ||
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      process.env.GEMINI_APIK_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.FITAI_AI_API_KEY ||
      "";

    console.log("[FoodGate] Inspecting image with food classification gatekeeper...");

    if (!apiKey) {
      console.warn("[FoodGate] No API key found for vision gatekeeper.");
      return { ok: false, isFood: false, detectedItem: "Unverified", error: "Missing API key" };
    }

    const cleanBase64 = base64Image.includes("base64,")
      ? base64Image.split("base64,")[1]
      : base64Image;

    const prompt = `You are a strict food classification gatekeeper.
Examine this image carefully:
Determine whether the image clearly contains ANY edible food, cooked dish, raw ingredient, fruit, vegetable, snack, or beverage intended for human consumption.
If the image shows non-food items (such as a person/selfie, room, car, computer/keyboard, pet/animal, document, furniture, shoe, wall, screen, or landscape), set is_food to false.

Respond ONLY with valid JSON in this exact structure:
{
  "is_food": true or false,
  "detected_item": "brief description of what is visible (e.g. 'Laptop keyboard', 'Slice of pizza', 'Pet cat')",
  "confidence": 0.95
}`;

    const models = ["gemini-3.5-flash-lite", "gemini-3.8-flash"];
    let classification: FoodClassificationResult | null = null;
    let lastErr = "";

    for (const model of models) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

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
                temperature: 0.1,
                max_output_tokens: 100,
              },
            }),
          }
        );

        const data = await res.json();
        if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const rawText = data.candidates[0].content.parts[0].text;
          classification = parseFoodClassificationResponse(rawText);
          break;
        } else {
          lastErr = data.error?.message || `HTTP ${res.status}`;
        }
      } catch (err: any) {
        lastErr = err.name === "AbortError" ? "Classification timed out" : err.message;
      } finally {
        clearTimeout(timer);
      }
    }

    if (!classification) {
      // If classification failed due to network/timeout, fail open so legitimate food isn't blocked
      return { ok: true, isFood: true, detectedItem: "Unverified", error: lastErr };
    }

    console.log("[FoodGate] Gate evaluation:", {
      isFood: classification.isFood,
      item: classification.detectedItem,
    });

    return {
      ok: true,
      isFood: classification.isFood,
      detectedItem: classification.detectedItem,
    };
  } catch (err: any) {
    return { ok: false, isFood: true, error: err.message || "Failed to classify image." };
  }
}
