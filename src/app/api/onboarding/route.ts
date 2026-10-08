import { NextRequest, NextResponse } from "next/server";
import { jsonReadError, requireSameOrigin, readJson } from "@/lib/api/request";
import { createSupabaseServerClient, isSupabaseConfigurationError } from "@/lib/supabase/server";
import { buildOnboardingRpcPayload } from "@/features/onboarding/onboarding-payload";
import type { QuestionnaireAnswers } from "@/features/onboarding/questionnaire";

export const dynamic = "force-dynamic";

interface OnboardingRequestBody {
  answers?: QuestionnaireAnswers;
  displayName?: string | null;
  countryCode?: string | null;
  // Legacy flat fields for backward compatibility
  goal?: QuestionnaireAnswers["goal"];
  birthDate?: string;
  sex?: QuestionnaireAnswers["sex"];
  heightCm?: number;
  weightKg?: number;
  activity?: QuestionnaireAnswers["activity"];
  workouts?: QuestionnaireAnswers["workouts"];
  goalWeightKg?: number;
  paceKgPerWeek?: number;
  diet?: QuestionnaireAnswers["diet"];
  mealsPerDay?: QuestionnaireAnswers["mealsPerDay"];
  rollover?: QuestionnaireAnswers["rollover"];
}

export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const body = await readJson(request);
  if (!body.ok) return jsonReadError(body);

  const raw = (body.value ?? {}) as OnboardingRequestBody;

  // Extract answers from body.answers or flat body properties
  const answers: QuestionnaireAnswers = raw.answers ?? {
    goal: raw.goal,
    birthDate: raw.birthDate,
    sex: raw.sex,
    heightCm: raw.heightCm,
    weightKg: raw.weightKg,
    activity: raw.activity,
    workouts: raw.workouts,
    goalWeightKg: raw.goalWeightKg,
    paceKgPerWeek: raw.paceKgPerWeek,
    diet: raw.diet,
    mealsPerDay: raw.mealsPerDay,
    rollover: raw.rollover
  };

  const displayName = typeof raw.displayName === "string" ? raw.displayName.trim().slice(0, 80) : null;
  const countryCode = typeof raw.countryCode === "string" && /^[A-Z]{2}$/.test(raw.countryCode) ? raw.countryCode : null;

  let rpcParams;
  try {
    rpcParams = buildOnboardingRpcPayload(answers, { displayName, countryCode });
  } catch (validationError) {
    const message = validationError instanceof Error ? validationError.message : "Invalid onboarding questionnaire answers.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to save onboarding." }, { status: 401 });

    const { error } = await supabase.rpc("complete_onboarding", rpcParams);

    if (error) {
      if (error.code === "23514") {
        return NextResponse.json({ error: "That goal is not available for this age range. Choose a non-weight-loss goal to continue." }, { status: 422 });
      }
      if (error.code === "22023") {
        return NextResponse.json({ error: error.message || "Invalid onboarding parameters." }, { status: 422 });
      }
      console.error("FITAI onboarding persistence failed", error.code ?? "unknown", error.message);
      return NextResponse.json({ error: "Onboarding could not be saved. Please try again later." }, { status: 503 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isSupabaseConfigurationError(error)) {
      return NextResponse.json({ error: "Authentication is not configured on this environment." }, { status: 503 });
    }
    console.error("FITAI onboarding service unavailable");
    return NextResponse.json({ error: "Onboarding could not be saved. Please try again later." }, { status: 503 });
  }
}

