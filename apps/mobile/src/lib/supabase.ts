import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type MobileSupabaseConfig = Readonly<{
  url: string;
  anonKey: string;
}>;

/**
 * Validates and retrieves the public Supabase configuration for the Mobile app.
 * Checks EXPO_PUBLIC_* variables first, falling back to NEXT_PUBLIC_* in shared test environments.
 */
export function getMobileSupabaseConfig(): MobileSupabaseConfig | null {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)?.trim();
  const anonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();

  if (!url || !anonKey) return null;

  try {
    const parsed = new URL(url);
    if (
      (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
      (parsed.protocol === "http:" && process.env.NODE_ENV === "production") ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getMobileSupabaseConfig() !== null;
}

let supabaseInstance: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client instance configured with React Native AsyncStorage.
 */
export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const config = getMobileSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured for Mobile. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  supabaseInstance = createClient(config.url, config.anonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseInstance;
}

/**
 * Resets the client singleton (useful for automated testing with different configurations).
 */
export function resetSupabaseInstanceForTesting(): void {
  supabaseInstance = null;
}
