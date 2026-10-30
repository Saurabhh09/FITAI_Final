/**
 * ImageKit Real-time URL-based Transformation Utility
 *
 * Implements image resizing, cropping, and downscaling using ImageKit.io's
 * real-time URL transformation API parameters before sending images to AI vision models.
 *
 * Supported transformations based on ImageKit Documentation:
 * - Width: w-<number>
 * - Height: h-<number>
 * - Max-size cropping: c-at_max (preserves full image & aspect ratio, ensures dimensions <= requested)
 * - Maintain ratio: c-maintain_ratio
 * - Pad resize: cm-pad_resize
 * - Forced crop: c-force
 * - Quality: q-<number>
 * - Format: f-<format>
 */

export type ImageKitCropMode =
  | "c-at_max"
  | "c-maintain_ratio"
  | "c-force"
  | "c-at_least"
  | "cm-pad_resize"
  | "cm-extract";

export type ImageKitTransformOptions = {
  /** Output width in pixels (e.g. 1024, 800) */
  width?: number;
  /** Output height in pixels (e.g. 1024, 800) */
  height?: number;
  /** Cropping / resizing strategy (default: 'c-at_max' to preserve full content & aspect ratio) */
  cropMode?: ImageKitCropMode;
  /** Image quality (1-100, e.g. 80) */
  quality?: number;
  /** Desired format (e.g. 'webp', 'jpg', 'auto') */
  format?: string;
  /** Use query parameter (?tr=...) instead of path-based (/tr:.../) */
  useQueryParam?: boolean;
};

/**
 * Default transformation settings optimized for AI vision models (Gemini Flash Vision):
 * - Max bounding box: 1024 x 1024 pixels
 * - Strategy: 'c-at_max' (100% of food items and plate context preserved, zero cropping)
 * - Quality: 85 (optimal balance of sharpness and minimal payload size)
 */
export const DEFAULT_VISION_TRANSFORM_OPTIONS: ImageKitTransformOptions = {
  width: 1024,
  height: 1024,
  cropMode: "c-at_max",
  quality: 85,
};

/**
 * Builds the transformation string from options (e.g. 'w-1024,h-1024,c-at_max,q-85').
 */
export function buildTransformString(options: ImageKitTransformOptions = {}): string {
  const parts: string[] = [];

  const width = options.width;
  const height = options.height;
  const cropMode = options.cropMode ?? (width || height ? "c-at_max" : undefined);

  if (width !== undefined && width > 0) {
    parts.push(`w-${Math.round(width)}`);
  }
  if (height !== undefined && height > 0) {
    parts.push(`h-${Math.round(height)}`);
  }
  if (cropMode) {
    parts.push(cropMode);
  }
  if (options.quality !== undefined && options.quality > 0 && options.quality <= 100) {
    parts.push(`q-${Math.round(options.quality)}`);
  }
  if (options.format) {
    parts.push(`f-${options.format}`);
  }

  return parts.join(",");
}

/**
 * Transforms an ImageKit image URL to downscale the image using ImageKit's real-time transformation API.
 *
 * Examples:
 * Input:  https://ik.imagekit.io/fitai_cdn/meal_scans/meal_123.jpg
 * Output: https://ik.imagekit.io/fitai_cdn/tr:w-1024,h-1024,c-at_max,q-85/meal_scans/meal_123.jpg
 *
 * If useQueryParam is true:
 * Output: https://ik.imagekit.io/fitai_cdn/meal_scans/meal_123.jpg?tr=w-1024,h-1024,c-at_max,q-85
 */
export function buildImageKitTransformedUrl(
  originalUrl: string,
  options: ImageKitTransformOptions = DEFAULT_VISION_TRANSFORM_OPTIONS
): string {
  if (!originalUrl || typeof originalUrl !== "string") {
    return originalUrl;
  }

  const trString = buildTransformString(options);
  if (!trString) {
    return originalUrl;
  }

  // If not an ImageKit URL, return original
  if (!originalUrl.includes("ik.imagekit.io")) {
    return originalUrl;
  }

  try {
    const url = new URL(originalUrl);

    if (options.useQueryParam) {
      // Set or replace query parameter tr=...
      url.searchParams.set("tr", trString);
      return url.toString();
    }

    // Path-based transformation:
    // Standard ImageKit URL format: https://ik.imagekit.io/<imagekit_id>/<path_to_file>
    // Transformed URL format:       https://ik.imagekit.io/<imagekit_id>/tr:<trString>/<path_to_file>

    // 1. If path already has a transformation (/tr:...), replace it
    if (url.pathname.includes("/tr:")) {
      url.pathname = url.pathname.replace(/\/tr:[^/]+/, `/tr:${trString}`);
      return url.toString();
    }

    // 2. If it already has query parameter tr=..., replace that instead
    if (url.searchParams.has("tr")) {
      url.searchParams.set("tr", trString);
      return url.toString();
    }

    // 3. Otherwise, insert path transformation after the endpoint identifier
    // url.pathname begins with /<endpoint>/<file_path>
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const endpoint = parts[0];
      const rest = parts.slice(1).join("/");
      url.pathname = `/${endpoint}/tr:${trString}/${rest}`;
      return url.toString();
    }

    // Fallback to query parameter if path structure is non-standard
    url.searchParams.set("tr", trString);
    return url.toString();
  } catch {
    // If URL parsing fails, fallback to simple query param appending
    const separator = originalUrl.includes("?") ? "&" : "?";
    return `${originalUrl}${separator}tr=${encodeURIComponent(trString)}`;
  }
}
