const fs = require('fs');

async function testGemini() {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_APIK_KEY ||
    process.env.EXPO_PUBLIC_GEMINI_APIK_KEY ||
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    "";
  const model = "gemini-3.5-flash-lite";

  // Tiny 1x1 black pixel or simple base64
  const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  const prompt = `You are a strict food classification gatekeeper.
Examine this image carefully:
Determine whether the image clearly contains ANY edible food, cooked dish, raw ingredient, fruit, vegetable, snack, or beverage intended for human consumption.
If the image shows non-food items (such as a person/selfie, room, car, computer/keyboard, pet/animal, document, furniture, shoe, wall, screen, or landscape), set is_food to false.

Respond ONLY with valid JSON in this exact structure:
{
  "is_food": true or false,
  "detected_item": "brief description of what is visible",
  "confidence": 0.95
}`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  
  console.log("Testing Gemini API call with key:", apiKey.substring(0, 8) + "...");
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Data,
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
    });

    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    console.log("Response body:", text);
  } catch (err) {
    console.error("Fetch error:", err);
  }
}

testGemini();
