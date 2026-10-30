import { describe, expect, it } from "vitest";
import { parseFoodClassificationResponse } from "./food-classifier-service";

describe("food-classifier-service", () => {
  it("correctly parses valid food response", () => {
    const raw = JSON.stringify({
      is_food: true,
      detected_item: "Grilled Chicken Breast with Steamed Broccoli",
      confidence: 0.96,
    });

    const result = parseFoodClassificationResponse(raw);
    expect(result.isFood).toBe(true);
    expect(result.detectedItem).toBe("Grilled Chicken Breast with Steamed Broccoli");
    expect(result.confidence).toBe(0.96);
  });

  it("correctly parses non-food response for everyday objects", () => {
    const raw = JSON.stringify({
      is_food: false,
      detected_item: "Mechanical keyboard and mouse",
      confidence: 0.99,
    });

    const result = parseFoodClassificationResponse(raw);
    expect(result.isFood).toBe(false);
    expect(result.detectedItem).toBe("Mechanical keyboard and mouse");
  });

  it("handles markdown codeblocks in response", () => {
    const raw = "```json\n{\"is_food\": false, \"detected_item\": \"Office chair\"}\n```";
    const result = parseFoodClassificationResponse(raw);
    expect(result.isFood).toBe(false);
    expect(result.detectedItem).toBe("Office chair");
  });

  it("handles stringified or malformed json safely", () => {
    const raw = "The image shows is_food: false because it is a wall";
    const result = parseFoodClassificationResponse(raw);
    expect(result.isFood).toBe(false);
    expect(result.detectedItem).toBe("Non-food object");
  });
});
