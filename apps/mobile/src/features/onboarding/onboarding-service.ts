import type { SupabaseClient } from "@supabase/supabase-js";
import { buildOnboardingRpcPayload, type CompleteOnboardingRpcParams } from "./onboarding-payload";
import type { QuestionnaireAnswers } from "./questionnaire";

export type OnboardingSubmissionResult =
  | { ok: true; payload: CompleteOnboardingRpcParams }
  | { ok: false; error: string };

export type SubmitOnboardingResult =
  | { ok: true }
  | { ok: false; error: string; code?: "UNAUTHENTICATED" | "VALIDATION_FAILED" | "RPC_ERROR" | "NETWORK_ERROR" };

/**
 * Validates and transforms mobile questionnaire answers into the canonical complete_onboarding RPC payload.
 * Nutrition target snapshots are derived exclusively through @fitai/nutrition-engine.
 */
export function prepareMobileOnboardingSubmission(
  answers: QuestionnaireAnswers,
  options?: { displayName?: string | null; countryCode?: string | null }
): OnboardingSubmissionResult {
  try {
    const payload = buildOnboardingRpcPayload(answers, options);
    return { ok: true, payload };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Onboarding answers could not be processed."
    };
  }
}

/**
 * Submits onboarding payload to Supabase via the authoritative complete_onboarding RPC.
 * Enforces session check, schema validation, and safe error handling.
 */
export async function submitMobileOnboarding(
  supabase: SupabaseClient,
  answers: QuestionnaireAnswers,
  options?: { displayName?: string | null; countryCode?: string | null }
): Promise<SubmitOnboardingResult> {
  // 1. Session verification
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        ok: false,
        error: "You must be signed in to complete onboarding.",
        code: "UNAUTHENTICATED"
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: "Unable to verify session. Please check your network connection.",
      code: "NETWORK_ERROR"
    };
  }

  // 2. Validate and build payload with shared @fitai/nutrition-engine
  const preparation = prepareMobileOnboardingSubmission(answers, options);
  if (!preparation.ok) {
    return {
      ok: false,
      error: preparation.error,
      code: "VALIDATION_FAILED"
    };
  }

  // 3. Execute authoritative complete_onboarding RPC
  try {
    const { error: rpcError } = await supabase.rpc("complete_onboarding", preparation.payload);
    if (rpcError) {
      return {
        ok: false,
        error: rpcError.message || "Could not complete onboarding. Please try again.",
        code: "RPC_ERROR"
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network failure while saving profile.",
      code: "NETWORK_ERROR"
    };
  }
}
