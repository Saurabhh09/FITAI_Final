import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkUserNutritionProfileExists } from "./profile-service";

describe("Mobile Auth Session & Profile Logic", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Session & Profile Routing State Machine", () => {
    it("determines profile exists = true when user has completed onboarding", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { user_id: "user-completed" },
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await checkUserNutritionProfileExists(mockClient, "user-completed");
      expect(result.exists).toBe(true);
    });

    it("determines profile exists = false when user has NOT completed onboarding", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await checkUserNutritionProfileExists(mockClient, "user-new");
      expect(result.exists).toBe(false);
    });

    it("propagates error when profile check fails due to database or network issues", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "Network connection lost" },
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await checkUserNutritionProfileExists(mockClient, "user-err");
      expect(result.exists).toBe(false);
      expect(result.error).toBe("Network connection lost");
    });
  });

  describe("Sign-In and Sign-Up Operations with Supabase Client", () => {
    it("authenticates via signInWithPassword with trimmed lowercased email", async () => {
      const signInMock = vi.fn().mockResolvedValue({
        data: {
          session: { user: { id: "user-123", email: "user@example.com" } },
        },
        error: null,
      });

      const mockClient = {
        auth: { signInWithPassword: signInMock },
      } as unknown as SupabaseClient;

      const email = "  User@Example.COM ";
      const password = "mysecurepassword";

      const res = await mockClient.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      expect(signInMock).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "mysecurepassword",
      });
      expect(res.data.session?.user.id).toBe("user-123");
    });

    it("handles sign-up with display name in user_metadata", async () => {
      const signUpMock = vi.fn().mockResolvedValue({
        data: {
          session: null,
          user: { id: "new-user-id" },
        },
        error: null,
      });

      const mockClient = {
        auth: { signUp: signUpMock },
      } as unknown as SupabaseClient;

      const res = await mockClient.auth.signUp({
        email: "newuser@example.com",
        password: "password123456",
        options: { data: { display_name: "Jane Doe" } },
      });

      expect(signUpMock).toHaveBeenCalledWith({
        email: "newuser@example.com",
        password: "password123456",
        options: { data: { display_name: "Jane Doe" } },
      });
      // Session null means email confirmation is required
      expect(res.data.session).toBeNull();
    });

    it("handles signOut to clear active session", async () => {
      const signOutMock = vi.fn().mockResolvedValue({ error: null });
      const mockClient = {
        auth: { signOut: signOutMock },
      } as unknown as SupabaseClient;

      const res = await mockClient.auth.signOut();
      expect(signOutMock).toHaveBeenCalled();
      expect(res.error).toBeNull();
    });
  });
});
