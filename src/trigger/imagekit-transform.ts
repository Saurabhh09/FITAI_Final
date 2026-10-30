/**
 * ImageKit Real-time URL-based Transformation Utility (Trigger.dev Worker)
 *
 * Implements image resizing, cropping, and downscaling using ImageKit.io's
 * real-time URL transformation API parameters before downloading image buffers
 * to feed into Google Gemini Vision.
 */

export type ImageKitCropMode =
  | "c-at_max"
  | "c-maintain_ratio"
  | "c-force"
  | "c-at_least"
  | "cm-pad_resize"
  | "cm-extract";

export type ImageKitTransformOptions = {
  width?: number;
  height?: number;
  cropMode?: ImageKitCropMode;
  quality?: number;
  format?: string;
  useQueryParam?: boolean;
};

export const DEFAULT_VISION_TRANSFORM_OPTIONS: ImageKitTransformOptions = {
  width: 1024,
  height: 1024,
  cropMode: "c-at_max",
  quality: 85,
};

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

  if (!originalUrl.includes("ik.imagekit.io")) {
    return originalUrl;
  }

  try {
    const url = new URL(originalUrl);

    if (options.useQueryParam) {
      url.searchParams.set("tr", trString);
      return url.toString();
    }

    if (url.pathname.includes("/tr:")) {
      url.pathname = url.pathname.replace(/\/tr:[^/]+/, `/tr:${trString}`);
      return url.toString();
    }

    if (url.searchParams.has("tr")) {
      url.searchParams.set("tr", trString);
      return url.toString();
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2) {
      const endpoint = parts[0];
      const rest = parts.slice(1).join("/");
      url.pathname = `/${endpoint}/tr:${trString}/${rest}`;
      return url.toString();
    }

    url.searchParams.set("tr", trString);
    return url.toString();
  } catch {
    const separator = originalUrl.includes("?") ? "&" : "?";
    return `${originalUrl}${separator}tr=${encodeURIComponent(trString)}`;
  }
}
