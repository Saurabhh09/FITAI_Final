import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  toBase64,
  uploadMealImageToImageKit,
  saveMealScanPending,
  triggerMealScanTask,
  analyzeMealDirectWithGemini,
  pollMealScanResult,
} from "./meal-scan-service";

describe("meal-scan-service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("toBase64", () => {
    it("correctly encodes ASCII string to base64", () => {
      const original = "fitai-secret-key:test";
      const encoded = toBase64(original);
      expect(encoded).toBe("Zml0YWktc2VjcmV0LWtleTp0ZXN0");
    });

    it("handles empty string", () => {
      expect(toBase64("")).toBe("");
    });
  });

  describe("uploadMealImageToImageKit", () => {
    it("returns error if secret key is not set", async () => {
      const origEnv = process.env.EXPO_PUBLIC_IMAGE_KIT_SECRET_KEY;
      delete process.env.EXPO_PUBLIC_IMAGE_KIT_SECRET_KEY;
      delete process.env.IMAGE_KIT_SECRET_KEY;

      const res = await uploadMealImageToImageKit("fake-base64");
      expect(res.ok).toBe(false);
      expect(res.error).toContain("ImageKit secret key is not configured");

      process.env.EXPO_PUBLIC_IMAGE_KIT_SECRET_KEY = origEnv;
    });

    it("successfully uploads base64 image", async () => {
      process.env.EXPO_PUBLIC_IMAGE_KIT_SECRET_KEY = "test_private_key";

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          url: "https://ik.imagekit.io/test/meal_scans/meal.jpg",
          fileId: "file_12345",
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const res = await uploadMealImageToImageKit("base64,sampledata", "test.jpg");
      expect(res.ok).toBe(true);
      expect(res.url).toBe("https://ik.imagekit.io/test/meal_scans/meal.jpg");
      expect(res.fileId).toBe("file_12345");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("handles upload API failure gracefully", async () => {
      process.env.EXPO_PUBLIC_IMAGE_KIT_SECRET_KEY = "test_private_key";

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          json: async () => ({ message: "Invalid secret key" }),
        })
      );

      const res = await uploadMealImageToImageKit("data");
      expect(res.ok).toBe(false);
      expect(res.error).toBe("Invalid secret key");
    });
  });

  describe("triggerMealScanTask", () => {
    it("returns error when TRIGGER_DEV_SECRET_KEY is missing", async () => {
      const origKey = process.env.EXPO_PUBLIC_TRIGGER_DEV_SECRET_KEY;
      delete process.env.EXPO_PUBLIC_TRIGGER_DEV_SECRET_KEY;
      delete process.env.TRIGGER_DEV_SECRET_KEY;

      const res = await triggerMealScanTask({
        scanId: "scan-1",
        imageUrl: "https://cdn.example.com/food.jpg",
        userId: "user-1",
      });

      expect(res.ok).toBe(false);
      expect(res.error).toContain("Trigger.dev secret key not configured");

      process.env.EXPO_PUBLIC_TRIGGER_DEV_SECRET_KEY = origKey;
    });

    it("successfully triggers task", async () => {
      process.env.EXPO_PUBLIC_TRIGGER_DEV_SECRET_KEY = "tr_dev_test";

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ id: "run_98765" }),
        })
      );

      const res = await triggerMealScanTask({
        scanId: "scan-1",
        imageUrl: "https://cdn.example.com/food.jpg",
        userId: "user-1",
      });

      expect(res.ok).toBe(true);
      expect(res.runId).toBe("run_98765");
    });
  });

  describe("analyzeMealDirectWithGemini", () => {
    it("returns parsed meal json when Gemini API responds", async () => {
      process.env.EXPO_PUBLIC_GEMINI_APIK_KEY = "gemini_test_key";

      const mockAnalysis = {
        meal_name: "Oatmeal with Berries",
        summary: "Healthy high-fiber breakfast",
        confidence_score: 0.95,
        total_calories: 320,
        total_protein_g: 12,
        total_carbs_g: 54,
        total_fat_g: 6,
        total_fiber_g: 8,
        items: [
          {
            name: "Rolled Oats",
            portion: "1 cup cooked",
            weight_g: 240,
            calories: 160,
            protein_g: 6,
            carbs_g: 28,
            fat_g: 3,
            fiber_g: 4,
          },
        ],
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockAnalysis) }],
                },
              },
            ],
          }),
        })
      );

      const res = await analyzeMealDirectWithGemini("fake-base64");
      expect(res.ok).toBe(true);
      expect(res.analysis?.meal_name).toBe("Oatmeal with Berries");
      expect(res.analysis?.total_calories).toBe(320);
    });
  });
});
