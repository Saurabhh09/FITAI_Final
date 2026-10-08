import { redirect } from "next/navigation";
import { OnboardingWizard } from "@/features/onboarding/onboarding-wizard";
import { createSupabaseServerClientIfConfigured } from "@/lib/supabase/server";
import type { QuestionnaireAnswers } from "@/features/onboarding/questionnaire";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClientIfConfigured();
  if (!supabase) {
    return (
      <main className="workspace-shell">
        <section className="workspace-card">
          <span className="workspace-status">Setup required</span>
          <h1>Onboarding needs secure account services.</h1>
          <p>Add the Supabase project URL and anon key to this server environment. No local profile or plan will be created as a substitute.</p>
          <a className="btn btn-light btn-small" href="/">Back to sign in</a>
        </section>
      </main>
    );
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/");

  const displayName = typeof user.user_metadata?.display_name === "string"
    ? user.user_metadata.display_name.slice(0, 80)
    : "";

  let initialAnswers: Partial<QuestionnaireAnswers> = {};

  try {
    const [profileRes, goalRes, allergiesRes, weightRes, nutritionRes] = await Promise.all([
      supabase.from("profiles").select("display_name, age_band, sex_for_reference, country_code").eq("id", user.id).maybeSingle(),
      supabase.from("user_goals").select("goal, target_weight_kg, weekly_change_kg").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
      supabase.from("user_allergies").select("allergen_key").eq("user_id", user.id),
      supabase.from("weight_entries").select("weight_kg").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("user_nutrition_profiles").select("*").eq("user_id", user.id).maybeSingle()
    ]);

    const profile = profileRes.data;
    const activeGoal = goalRes.data;
    const allergies = allergiesRes.data?.map(a => a.allergen_key) ?? [];
    const nutrition = nutritionRes.data;

    if (nutrition) {
      initialAnswers = {
        goal: nutrition.goal === "lose_weight" ? "lose" : nutrition.goal === "gain_weight" ? "gain" : "maintain",
        birthDate: nutrition.birth_date,
        sex: nutrition.sex_for_calculation === "female" ? "female" : nutrition.sex_for_calculation === "male" ? "male" : "other",
        heightCm: Number(nutrition.height_cm),
        weightKg: Number(nutrition.weight_kg),
        goalWeightKg: nutrition.target_weight_kg ? Number(nutrition.target_weight_kg) : undefined,
        paceKgPerWeek: nutrition.weekly_pace_kg ? Number(nutrition.weekly_pace_kg) : undefined,
        activity: nutrition.activity_level as QuestionnaireAnswers["activity"],
        workouts: nutrition.workouts_per_week as QuestionnaireAnswers["workouts"],
        diet: (nutrition.dietary_style as QuestionnaireAnswers["diet"]) ?? undefined,
        allergies: allergies.length > 0 ? allergies : ["none"],
        health: ["none"],
        mealsPerDay: nutrition.meals_per_day ? (String(nutrition.meals_per_day) as QuestionnaireAnswers["mealsPerDay"]) : undefined,
        foodPrefs: ["high-protein", "home-cooked"],
        barriers: ["consistency"],
        reminders: "meal",
        rollover: nutrition.calorie_rollover ? "yes" : "no"
      };
    } else if (profile?.age_band || activeGoal?.goal) {
      let birthDate = "2001-05-15";
      if (profile?.age_band === "13_17") birthDate = "2009-01-15";
      else if (profile?.age_band === "18_29") birthDate = "2001-04-10";
      else if (profile?.age_band === "30_49") birthDate = "1988-06-20";
      else if (profile?.age_band === "50_69") birthDate = "1966-08-12";
      else if (profile?.age_band === "70_plus") birthDate = "1950-02-18";

      const goalMap: Record<string, "lose" | "maintain" | "gain"> = {
        lose_weight: "lose",
        gain_weight: "gain",
        maintain: "maintain",
        improve_energy: "maintain",
        habit_consistency: "maintain",
        sports_performance: "gain"
      };

      const goal = activeGoal?.goal ? (goalMap[activeGoal.goal] ?? "gain") : "gain";
      const weightKg = weightRes.data?.weight_kg ? Number(weightRes.data.weight_kg) : 68;
      const goalWeightKg = activeGoal?.target_weight_kg && goal !== "maintain" ? Number(activeGoal.target_weight_kg) : undefined;
      const paceKgPerWeek = activeGoal?.weekly_change_kg && goal !== "maintain" ? Number(activeGoal.weekly_change_kg) : undefined;

      initialAnswers = {
        goal,
        sex: profile?.sex_for_reference === "female" ? "female" : profile?.sex_for_reference === "male" ? "male" : "other",
        birthDate,
        heightCm: 175,
        weightKg,
        goalWeightKg,
        paceKgPerWeek,
        activity: "moderate",
        workouts: "3-5",
        diet: "balanced",
        allergies: allergies.length > 0 ? allergies : ["none"],
        health: ["none"],
        mealsPerDay: "3",
        foodPrefs: ["high-protein", "home-cooked"],
        barriers: ["consistency"],
        reminders: "meal",
        rollover: "no"
      };
    }
  } catch {
    // Database fallback
  }

  return <OnboardingWizard initialName={displayName} initialAnswers={initialAnswers} />;
}
