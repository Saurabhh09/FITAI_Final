import { buildOnboardingRpcPayload, type CompleteOnboardingRpcParams } from "./onboarding-payload";
import type { QuestionnaireAnswers } from "./questionnaire";

export type OnboardingSubmissionResult =
  | { ok: true; payload: CompleteOnboardingRpcParams }
  | { ok: false; error: string };

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
