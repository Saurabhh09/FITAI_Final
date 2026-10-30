import { describe, expect, it } from "vitest";
import {
  buildTransformString,
  buildImageKitTransformedUrl,
  DEFAULT_VISION_TRANSFORM_OPTIONS,
} from "./imagekit-transform";

describe("imagekit-transform", () => {
  describe("buildTransformString", () => {
    it("builds default vision transform string with c-at_max", () => {
      const tr = buildTransformString(DEFAULT_VISION_TRANSFORM_OPTIONS);
      expect(tr).toBe("w-1024,h-1024,c-at_max,q-85");
    });

    it("supports width only with automatic c-at_max", () => {
      const tr = buildTransformString({ width: 800 });
      expect(tr).toBe("w-800,c-at_max");
    });

    it("supports custom dimensions and crop modes from ImageKit docs", () => {
      const tr1 = buildTransformString({ width: 300, height: 200, cropMode: "c-at_max" });
      expect(tr1).toBe("w-300,h-200,c-at_max");

      const tr2 = buildTransformString({ width: 400, height: 400, cropMode: "c-maintain_ratio" });
      expect(tr2).toBe("w-400,h-400,c-maintain_ratio");

      const tr3 = buildTransformString({ width: 600, height: 400, cropMode: "cm-extract" });
      expect(tr3).toBe("w-600,h-400,cm-extract");

      const tr4 = buildTransformString({ width: 800, height: 800, cropMode: "cm-pad_resize", quality: 90 });
      expect(tr4).toBe("w-800,h-800,cm-pad_resize,q-90");
    });
  });

  describe("buildImageKitTransformedUrl", () => {
    const rawUrl = "https://ik.imagekit.io/fitai_dev/meal_scans/meal_scan_1730198273.jpg";

    it("transforms URL to path-based downscale parameters", () => {
      const transformed = buildImageKitTransformedUrl(rawUrl);
      expect(transformed).toBe(
        "https://ik.imagekit.io/fitai_dev/tr:w-1024,h-1024,c-at_max,q-85/meal_scans/meal_scan_1730198273.jpg"
      );
    });

    it("supports query-parameter-based transformations", () => {
      const transformed = buildImageKitTransformedUrl(rawUrl, {
        width: 800,
        height: 800,
        cropMode: "c-at_max",
        useQueryParam: true,
      });
      expect(transformed).toBe(
        "https://ik.imagekit.io/fitai_dev/meal_scans/meal_scan_1730198273.jpg?tr=w-800%2Ch-800%2Cc-at_max"
      );
    });

    it("replaces existing path-based transformation", () => {
      const alreadyTransformed =
        "https://ik.imagekit.io/fitai_dev/tr:w-300,h-200/meal_scans/meal_scan_1730198273.jpg";
      const updated = buildImageKitTransformedUrl(alreadyTransformed, {
        width: 1024,
        height: 1024,
        cropMode: "c-at_max",
      });
      expect(updated).toBe(
        "https://ik.imagekit.io/fitai_dev/tr:w-1024,h-1024,c-at_max/meal_scans/meal_scan_1730198273.jpg"
      );
    });

    it("replaces existing query-parameter transformation", () => {
      const alreadyTransformed =
        "https://ik.imagekit.io/fitai_dev/meal_scans/meal_scan_1730198273.jpg?tr=w-300";
      const updated = buildImageKitTransformedUrl(alreadyTransformed, {
        width: 1024,
        height: 1024,
        cropMode: "c-at_max",
      });
      expect(updated).toContain("tr=w-1024%2Ch-1024%2Cc-at_max");
    });

    it("leaves non-ImageKit URLs untouched", () => {
      const externalUrl = "https://cdn.example.com/images/meal.png";
      expect(buildImageKitTransformedUrl(externalUrl)).toBe(externalUrl);
    });

    it("handles empty or invalid URLs safely", () => {
      expect(buildImageKitTransformedUrl("")).toBe("");
      expect(buildImageKitTransformedUrl(null as any)).toBe(null);
    });
  });
});
