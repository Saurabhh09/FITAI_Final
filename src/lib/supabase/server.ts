import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { getSupabasePublicConfig, hasSupabasePublicConfig, supabaseCookieOptions } from "./config";

export class SupabaseConfigurationError extends Error {
  readonly code = "SUPABASE_NOT_CONFIGURED";

  constructor() {
    super("Supabase Auth is not configured for this environment.");
    this.name = "SupabaseConfigurationError";
  }
}

export function isSupabaseConfigurationError(error: unknown): error is SupabaseConfigurationError {
  return error instanceof SupabaseConfigurationError;
}

export function hasSupabaseConfiguration(): boolean {
  return hasSupabasePublicConfig();
}

export async function createSupabaseServerClient(request?: NextRequest) {
  const config = getSupabasePublicConfig();
  if (!config) throw new SupabaseConfigurationError();

  const authHeader = request?.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const client = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      });
      const originalGetUser = client.auth.getUser.bind(client.auth);
      client.auth.getUser = (jwt?: string) => originalGetUser(jwt || token);
      return client;
    }
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. The Next Proxy refreshes sessions
          // before protected pages render; route handlers/actions can write their own.
        }
      }
    },
    cookieOptions: supabaseCookieOptions()
  });
}

export async function createSupabaseServerClientIfConfigured() {
  try {
    return await createSupabaseServerClient();
  } catch (error) {
    if (isSupabaseConfigurationError(error)) return null;
    throw error;
  }
}
