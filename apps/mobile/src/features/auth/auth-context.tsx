import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "../../lib/supabase";
import { checkUserNutritionProfileExists } from "./profile-service";

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  hasNutritionProfile: boolean | null;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ ok: boolean; error?: string; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [hasNutritionProfile, setHasNutritionProfile] = useState<boolean | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  async function checkProfileForUser(userId: string): Promise<boolean> {
    if (!configured) return false;
    setProfileLoading(true);
    try {
      const client = getSupabase();
      const res = await checkUserNutritionProfileExists(client, userId);
      setHasNutritionProfile(res.exists);
      return res.exists;
    } catch {
      setHasNutritionProfile(false);
      return false;
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const client = getSupabase();

    // 1. Restore initial session from persistent storage (AsyncStorage)
    client.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error }) => {
        if (!isMounted) return;
        if (error || !initialSession) {
          setSession(null);
          setHasNutritionProfile(null);
          setLoading(false);
          return;
        }

        setSession(initialSession);
        await checkProfileForUser(initialSession.user.id);
        if (isMounted) setLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
          setLoading(false);
        }
      });

    // 2. Subscribe to auth changes (token refresh, sign-in, sign-out)
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);

      if (currentSession?.user) {
        await checkProfileForUser(currentSession.user.id);
      } else {
        setHasNutritionProfile(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    if (!configured) {
      return { ok: false, error: "Supabase authentication is not configured for Mobile." };
    }
    try {
      const client = getSupabase();
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { ok: false, error: error.message || "Invalid email or password." };
      }

      setSession(data.session);
      if (data.session?.user) {
        await checkProfileForUser(data.session.user.id);
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Authentication request failed. Check connection.",
      };
    }
  }

  async function signUp(
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ ok: boolean; error?: string; requiresEmailConfirmation?: boolean }> {
    if (!configured) {
      return { ok: false, error: "Supabase authentication is not configured for Mobile." };
    }
    try {
      const client = getSupabase();
      const { data, error } = await client.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: displayName ? { display_name: displayName.trim() } : undefined,
        },
      });

      if (error) {
        return { ok: false, error: error.message || "Failed to create account." };
      }

      if (!data.session) {
        return {
          ok: true,
          requiresEmailConfirmation: true,
        };
      }

      setSession(data.session);
      if (data.session.user) {
        await checkProfileForUser(data.session.user.id);
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Registration request failed. Check connection.",
      };
    }
  }

  async function signOut(): Promise<void> {
    if (!configured) return;
    try {
      const client = getSupabase();
      await client.auth.signOut();
    } finally {
      setSession(null);
      setHasNutritionProfile(null);
    }
  }

  async function refreshProfile(): Promise<boolean> {
    if (!session?.user) return false;
    return checkProfileForUser(session.user.id);
  }

  const value: AuthContextValue = {
    configured,
    loading,
    session,
    user: session?.user ?? null,
    hasNutritionProfile,
    profileLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
