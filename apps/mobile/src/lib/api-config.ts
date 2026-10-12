/**
 * Resolves the backend Next.js API origin for Mobile.
 *
 * Checks EXPO_PUBLIC_API_URL first, then FITAI_APP_ORIGIN,
 * defaulting to http://localhost:3000 for standard local development.
 */
export function getMobileApiUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL || process.env.FITAI_APP_ORIGIN)?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}
