"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/features/brand/brand-logo";
import { WheelDatePicker, type WheelDateValue } from "./wheel-date-picker";
import { calculateUserPlan } from "./plan-calc";
import {
  getAgeYears,
  getVisibleFlow,
  isStepValid,
  questionnaireFlow,
  setSingleAnswer,
  toggleMultiAnswer,
  type QuestionnaireAnswers,
  type QuestionnaireStepId,
  type QuestionOption
} from "./questionnaire";

const ICONS: Record<string, string> = {
  arrowDown: "↓", minus: "−", arrowUp: "↑", male: "♂", female: "♀",
  person: "◉", walk: "↗", activity: "⌁", bolt: "ϟ", clock: "◷",
  dumbbell: "◇", plate: "◉", leaf: "♧", sprout: "♣", fish: "≈",
  olive: "●", drumstick: "◈", fork: "⋔", sparkles: "✦", heart: "♡",
  target: "◎", bell: "♧", moon: "☾", calendar: "▦", refresh: "↻",
  chart: "▥", users: "◉", check: "✓"
};



function selectSingle(answers: QuestionnaireAnswers, id: QuestionnaireStepId): string | undefined {
  switch (id) {
    case "goal": return answers.goal;
    case "sex": return answers.sex;
    case "activity": return answers.activity;
    case "workouts": return answers.workouts;
    case "diet": return answers.diet;
    case "meals": return answers.mealsPerDay;
    case "reminders": return answers.reminders;
    case "rollover": return answers.rollover;
    default: return undefined;
  }
}

function selectMulti(answers: QuestionnaireAnswers, id: QuestionnaireStepId): readonly string[] {
  switch (id) {
    case "allergies": return answers.allergies ?? [];
    case "health": return answers.health ?? [];
    case "food-prefs": return answers.foodPrefs ?? [];
    case "barriers": return answers.barriers ?? [];
    default: return [];
  }
}

function setMultiAnswer(answers: QuestionnaireAnswers, id: QuestionnaireStepId, values: string[]): QuestionnaireAnswers {
  switch (id) {
    case "allergies": return { ...answers, allergies: values };
    case "health": return { ...answers, health: values };
    case "food-prefs": return { ...answers, foodPrefs: values };
    case "barriers": return { ...answers, barriers: values };
    default: return answers;
  }
}

function formatHeight(cm?: number, unit: "cm" | "ft / in" = "cm"): string {
  if (cm === undefined) return "Select height";
  if (unit === "cm") return `${Math.round(cm)} cm`;
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}

function formatWeight(kg?: number, unit: "kg" | "lb" = "kg"): string {
  if (kg === undefined) return "Select weight";
  return `${(unit === "lb" ? kg * 2.20462262 : kg).toFixed(1)} ${unit}`;
}

const DEFAULT_ANSWERS: QuestionnaireAnswers = {
  goal: "gain",
  sex: "male",
  birthDate: "2001-05-15",
  heightCm: 175,
  weightKg: 68,
  activity: "moderate",
  workouts: "3-5",
  diet: "balanced",
  allergies: ["none"],
  health: ["none"],
  mealsPerDay: "3",
  foodPrefs: ["high-protein", "home-cooked"],
  barriers: ["consistency"],
  reminders: "meal",
  rollover: "no"
};

export function OnboardingWizard({
  initialName,
  initialAnswers
}: {
  initialName: string;
  initialAnswers?: Partial<QuestionnaireAnswers>;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(() => {
    const hasInitial = initialAnswers && Object.keys(initialAnswers).length > 0;
    let localSaved: Partial<QuestionnaireAnswers> = {};
    if (!hasInitial && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("fitai_onboarding_answers");
        if (raw) localSaved = JSON.parse(raw);
      } catch {}
    }
    return {
      ...DEFAULT_ANSWERS,
      ...localSaved,
      ...initialAnswers
    };
  });

  const [stepId, setStepId] = useState<QuestionnaireStepId>("goal");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft / in">("cm");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const age = getAgeYears(answers.birthDate);
  const flow = useMemo(() => getVisibleFlow(answers), [answers]);
  const currentIndex = Math.max(0, flow.findIndex((s) => s.id === stepId));
  const step = flow[currentIndex] ?? questionnaireFlow[0];
  const progressPercent = Math.round(((currentIndex + 1) / flow.length) * 100);
  const isLastStep = currentIndex === flow.length - 1;

  function changeAnswer(next: QuestionnaireAnswers) {
    setAnswers(next);
    setError("");
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("fitai_onboarding_answers", JSON.stringify(next));
      } catch {}
    }
  }

  function goBack() {
    setError("");
    if (currentIndex === 0) {
      router.replace("/dashboard");
      return;
    }
    setStepId(flow[currentIndex - 1].id);
  }

  function advance() {
    if (!isStepValid(step, answers)) {
      setError(step.id === "dob" ? "Enter a valid date of birth to continue." : "Choose an answer to continue.");
      return;
    }
    setError("");
    if (!isLastStep) {
      setStepId(flow[currentIndex + 1].id);
      return;
    }
    void saveOnboarding();
  }

  async function saveOnboarding() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          answers,
          displayName: initialName || null
        })
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Your answers could not be saved. Please try again.");
        return;
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("fitai_onboarding_answers");
        } catch {}
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("The service couldn't be reached. Your answers were not saved.");
    } finally {
      setBusy(false);
    }
  }



  function renderStepBody() {
    if (step.type === "single") {
      const selectedValue = selectSingle(answers, step.id);
      return (
        <div className={step.grid ? "option-grid" : "option-list"}>
          {(step.options ?? []).map((option) => (
            <button
              key={option.value}
              type="button"
              className={`option-card${selectedValue === option.value ? " selected" : ""}`}
              aria-pressed={selectedValue === option.value}
              onClick={() => {
                if (!step.key) return;
                const next = setSingleAnswer(answers, step.id, option.value);
                changeAnswer(next);
              }}
            >
              <span className="option-icon" aria-hidden="true">{ICONS[option.icon] ?? "✦"}</span>
              <span className="option-copy">
                <span className="option-title">{option.title}</span>
                {option.description ? <span className="option-desc">{option.description}</span> : null}
              </span>
              <span className="option-check" aria-hidden="true">{selectedValue === option.value ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      );
    }

    if (step.type === "multi") {
      const selected = selectMulti(answers, step.id);
      return (
        <div>
          <p className="multi-label"><span>✓</span><span>Choose all that apply</span></p>
          <div className="chip-grid">
            {(step.options ?? []).map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`select-chip${isSelected ? " selected" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => {
                    const exclusive = step.id === "health" ? ["none", "prefer-not"] : step.noneValue ? [step.noneValue] : [];
                    changeAnswer(setMultiAnswer(answers, step.id, toggleMultiAnswer(selected, option.value, exclusive)));
                  }}
                >
                  <span aria-hidden="true">{ICONS[option.icon] ?? "✓"}</span>
                  <span>{option.title}</span>
                </button>
              );
            })}
          </div>
          {step.id === "allergies" ? (
            <p className="metric-note">Food tracking cannot guarantee allergen safety. Always check labels and restaurant preparations.</p>
          ) : null}
        </div>
      );
    }

    if (step.type === "date") {
      const [y = 2001, m = 5, d = 15] = (answers.birthDate || "2001-05-15").split("-").map(Number);
      const wheelValue: WheelDateValue = {
        year: Number.isFinite(y) ? y : 2001,
        month: Number.isFinite(m) ? m : 5,
        day: Number.isFinite(d) ? d : 15
      };

      return (
        <div>
          <WheelDatePicker
            value={wheelValue}
            onChange={(next) => {
              const mm = String(next.month).padStart(2, "0");
              const dd = String(next.day).padStart(2, "0");
              changeAnswer({ ...answers, birthDate: `${next.year}-${mm}-${dd}` });
            }}
          />
          <div className="age-preview">
            <span>ℹ</span>
            <span>
              {age !== null
                ? `${age} years old · your birth date is protected.`
                : "Select your birth date to calculate personalized baseline needs."}
            </span>
          </div>
        </div>
      );
    }

    if (step.type === "height") {
      const height = answers.heightCm ?? 170;
      return (
        <div className="metric-panel">
          <div className="metric-top">
            <div>
              <p className="metric-label">Height</p>
              <p className="metric-value">{formatHeight(answers.heightCm, heightUnit)}</p>
            </div>
            <div className="unit-switch">
              <button type="button" className={heightUnit === "cm" ? "active" : ""} onClick={() => setHeightUnit("cm")}>cm</button>
              <button type="button" className={heightUnit === "ft / in" ? "active" : ""} onClick={() => setHeightUnit("ft / in")}>ft / in</button>
            </div>
          </div>
          <div className="range-ruler">
            <input
              type="range"
              className="range-input"
              min={120}
              max={220}
              value={height}
              onChange={(e) => changeAnswer({ ...answers, heightCm: Number(e.target.value) })}
            />
          </div>
          <div className="range-endpoints">
            <span>120 cm</span>
            <span>220 cm</span>
          </div>
          <p className="metric-note">Drag slider to adjust. Your height is used only to estimate energy baselines.</p>
        </div>
      );
    }

    if (step.type === "weight") {
      const weight = answers.weightKg ?? 70;
      return (
        <div className="metric-panel">
          <div className="metric-top">
            <div>
              <p className="metric-label">Current Weight</p>
              <p className="metric-value">{formatWeight(answers.weightKg, weightUnit)}</p>
            </div>
            <div className="unit-switch">
              <button type="button" className={weightUnit === "kg" ? "active" : ""} onClick={() => setWeightUnit("kg")}>kg</button>
              <button type="button" className={weightUnit === "lb" ? "active" : ""} onClick={() => setWeightUnit("lb")}>lb</button>
            </div>
          </div>
          <div className="range-ruler">
            <input
              type="range"
              className="range-input"
              min={35}
              max={180}
              step={0.5}
              value={weight}
              onChange={(e) => changeAnswer({ ...answers, weightKg: Number(e.target.value) })}
            />
          </div>
          <div className="range-endpoints">
            <span>35 kg</span>
            <span>180 kg</span>
          </div>
          <p className="metric-note">Your current weight is a baseline for nutrition calculations and can be updated anytime.</p>
        </div>
      );
    }

    if (step.type === "goal-weight") {
      const current = answers.weightKg ?? 70;
      const losing = answers.goal === "lose";
      const min = losing ? Math.max(30, current - 35) : current;
      const max = losing ? current : Math.min(220, current + 35);
      const goalWeight = answers.goalWeightKg ?? current;

      return (
        <div className="metric-panel">
          <div className="metric-top">
            <div>
              <p className="metric-label">Goal Weight</p>
              <p className="metric-value">{formatWeight(answers.goalWeightKg, weightUnit)}</p>
            </div>
            <div className="unit-switch">
              <button type="button" className={weightUnit === "kg" ? "active" : ""} onClick={() => setWeightUnit("kg")}>kg</button>
              <button type="button" className={weightUnit === "lb" ? "active" : ""} onClick={() => setWeightUnit("lb")}>lb</button>
            </div>
          </div>
          <div className="range-ruler">
            <input
              type="range"
              className="range-input"
              min={min}
              max={max}
              step={0.5}
              value={goalWeight}
              onChange={(e) => changeAnswer({ ...answers, goalWeightKg: Number(e.target.value) })}
            />
          </div>
          <div className="range-endpoints">
            <span>{formatWeight(min, weightUnit)}</span>
            <span>{formatWeight(max, weightUnit)}</span>
          </div>
          <p className="metric-note">Choose a target direction that feels sustainable and healthy.</p>
        </div>
      );
    }

    if (step.type === "pace") {
      const gainPaces: QuestionOption[] = [
        { value: "0.15", title: "Gentle", description: "About 0.15 kg per week", icon: "walk" },
        { value: "0.25", title: "Steady", description: "About 0.25 kg per week", icon: "activity", recommended: true },
        { value: "0.35", title: "Faster", description: "About 0.35 kg per week", icon: "bolt" }
      ];
      const losePaces: QuestionOption[] = [
        { value: "0.25", title: "Gentle", description: "About 0.25 kg per week", icon: "walk" },
        { value: "0.4", title: "Steady", description: "About 0.4 kg per week", icon: "activity", recommended: true },
        { value: "0.5", title: "Faster", description: "About 0.5 kg per week", icon: "bolt" }
      ];
      const paces = answers.goal === "gain" ? gainPaces : losePaces;

      return (
        <div className="option-list">
          {paces.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`option-card${answers.paceKgPerWeek === Number(opt.value) ? " selected" : ""}`}
              aria-pressed={answers.paceKgPerWeek === Number(opt.value)}
              onClick={() => changeAnswer({ ...answers, paceKgPerWeek: Number(opt.value) })}
            >
              <span className="option-icon" aria-hidden="true">{ICONS[opt.icon]}</span>
              <span className="option-copy">
                <span className="option-title">{opt.title}</span>
                <span className="option-desc">{opt.description}</span>
              </span>
              <span className="option-check" aria-hidden="true">{answers.paceKgPerWeek === Number(opt.value) ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      );
    }

    if (step.id === "weight-insight") {
      const current = answers.weightKg ?? 70;
      const target = answers.goalWeightKg ?? current;
      const diffKg = Math.abs(target - current);
      const isGaining = answers.goal === "gain" || target > current;
      const action = isGaining ? "Gaining" : "Losing";
      const diffFormatted = `${diffKg.toFixed(1)} kg`;

      return (
        <div className="weight-insight-wrap">
          <h2 className="weight-insight-title">
            {diffKg === 0 ? (
              <>Maintaining your weight is a realistic target. It&apos;s not hard at all!</>
            ) : (
              <>{action} <span className="weight-insight-accent">{diffFormatted}</span> is a realistic target. It&apos;s not hard at all!</>
            )}
          </h2>
          <p className="weight-insight-subtitle">
            90% of users say that the change is obvious after using Fit AI and it is not easy to rebound.
          </p>
        </div>
      );
    }

    if (step.id === "plan-social-proof") {
      return (
        <div className="plan-social-proof-wrap">
          <h1 className="plan-proof-heading">Join over 10 million people like you</h1>

          <div className="plan-proof-stats-row">
            <div className="proof-stat-badge">
              <div className="laurel-wreath">
                <span className="wreath-icon">🌿</span>
                <span className="rating-score">4.8 ★</span>
                <span className="wreath-icon">🌿</span>
              </div>
              <span className="stat-sub">avg rating</span>
              <span className="stat-count">300K+ App Ratings</span>
            </div>

            <div className="proof-users-badge">
              <div className="avatar-cluster">
                <div className="cluster-avatar avatar-1">👨‍💼</div>
                <div className="cluster-avatar avatar-2">👩‍🦰</div>
                <div className="cluster-avatar avatar-3">👨‍🎓</div>
              </div>
              <span className="stat-count">10M+ Fit AI Users</span>
            </div>
          </div>

          <div className="testimonial-cards">
            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="stars">★★★★★</div>
                <div className="author-tag">
                  <div className="author-avatar">👨‍💻</div>
                  <span className="author-name">Jake Sullivan</span>
                </div>
              </div>
              <p className="testimonial-text">
                &ldquo;I lost 15 lbs in 2 months! I was about to go on Ozempic but decided to give this app a shot and it worked :)&rdquo;
              </p>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-header">
                <div className="stars">★★★★★</div>
                <div className="author-tag">
                  <div className="author-avatar">🧔</div>
                  <span className="author-name">Benny Marcs</span>
                </div>
              </div>
              <p className="testimonial-text">
                &ldquo;The time I have saved not weighing my food has allowed me to start trading stocks during the day.&rdquo;
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (step.id === "plan-recommendation") {
      const p = calculateUserPlan(answers);
      const targetLabel = p.isWeightGain
        ? `Gain ${p.weightDiffKg ? `${p.weightDiffKg.toFixed(1)} kg ` : ""}${p.projectedTargetDateFormatted ? `by ${p.projectedTargetDateFormatted}` : ""}`.trim()
        : p.isWeightLoss
        ? `Lose ${p.weightDiffKg ? `${p.weightDiffKg.toFixed(1)} kg ` : ""}${p.projectedTargetDateFormatted ? `by ${p.projectedTargetDateFormatted}` : ""}`.trim()
        : "Maintain current weight";
      const goalWeightText = p.targetWeightKg !== null ? `${p.targetWeightKg.toFixed(1)} kg` : "Flexible";

      return (
        <div className="plan-recommendation-wrap">
          <div className="recommendation-header">
            <h1 className="rec-title">Your daily recommendation</h1>
            <p className="rec-subtitle">You can edit this anytime</p>
          </div>

          <div className="rec-calorie-card">
            <div className="rec-cal-left">
              <span className="rec-cal-icon">🔥</span>
              <div>
                <div className="rec-cal-number">{p.targets.calories.toLocaleString()}</div>
                <span className="rec-cal-label">Calories</span>
              </div>
            </div>
            <span className="rec-edit-icon" title="Editable">✏️</span>
          </div>

          <div className="rec-macros-grid">
            <div className="rec-macro-card">
              <div className="macro-top">
                <span className="macro-emoji">🍗</span>
                <span className="macro-edit">✏️</span>
              </div>
              <div className="macro-val">{p.targets.proteinGrams}g</div>
              <div className="macro-name">Protein</div>
            </div>

            <div className="rec-macro-card">
              <div className="macro-top">
                <span className="macro-emoji">🌾</span>
                <span className="macro-edit">✏️</span>
              </div>
              <div className="macro-val">{p.targets.carbsGrams}g</div>
              <div className="macro-name">Carbs</div>
            </div>

            <div className="rec-macro-card">
              <div className="macro-top">
                <span className="macro-emoji">🥑</span>
                <span className="macro-edit">✏️</span>
              </div>
              <div className="macro-val">{p.targets.fatGrams}g</div>
              <div className="macro-name">Fats</div>
            </div>
          </div>

          <div className="rec-info-card">
            <h3 className="info-title">Your info</h3>
            <p className="info-subtitle">This plan is customized for you.</p>

            <div className="info-rows">
              <div className="info-row">
                <span className="info-icon">👤</span>
                <span className="info-text">Your weight: <strong>{p.currentWeightKg.toFixed(1)} kg</strong></span>
              </div>
              <div className="info-row">
                <span className="info-icon">🚩</span>
                <span className="info-text">Goal weight: <strong>{goalWeightText}</strong></span>
              </div>
              <div className="info-row">
                <span className="info-icon">🏃</span>
                <span className="info-text">Activity level: <strong>{p.activityLabel}</strong></span>
              </div>
              <div className="info-row">
                <span className="info-icon">🎯</span>
                <span className="info-text">
                  Target: <strong>{targetLabel}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="rec-preview-section">
            <h4 className="preview-heading">How to reach your goals:</h4>
            <div className="preview-item">
              <span className="preview-icon">💖</span>
              <span className="preview-text">Get your weekly life score and improve your routine.</span>
            </div>
          </div>
        </div>
      );
    }

    if (step.id === "plan-strategy") {
      return (
        <div className="plan-strategy-wrap">
          <div className="strategy-section">
            <h2 className="strategy-heading">How to reach your goals:</h2>
            <div className="strategy-cards">
              <div className="strategy-card">
                <span className="strategy-icon">💖</span>
                <span className="strategy-text">Get your weekly life score and improve your routine.</span>
              </div>
              <div className="strategy-card">
                <span className="strategy-icon">🥑</span>
                <span className="strategy-text">Track your food</span>
              </div>
              <div className="strategy-card">
                <span className="strategy-icon">⏱️</span>
                <span className="strategy-text">Follow your daily calorie recommendation</span>
              </div>
              <div className="strategy-card">
                <span className="strategy-icon">🌾</span>
                <span className="strategy-text">Balance your carbs, protein, fat</span>
              </div>
            </div>
          </div>

          <div className="benefits-section">
            <h2 className="strategy-heading">Benefits with Fit AI:</h2>
            <div className="benefits-cards">
              <div className="benefit-card without">
                <h4 className="benefit-title">Without Fit AI</h4>
                <ul className="benefit-list">
                  <li><span className="cross">✕</span> Tedious to track what you eat</li>
                  <li><span className="cross">✕</span> Unclear how to reach your goals</li>
                  <li><span className="cross">✕</span> Hard to stay motivated</li>
                </ul>
              </div>

              <div className="benefit-card with">
                <h4 className="benefit-title">With Fit AI</h4>
                <ul className="benefit-list">
                  <li><span className="check">✓</span> Log food in seconds</li>
                  <li><span className="check">✓</span> Clear daily targets to follow</li>
                  <li><span className="check">✓</span> AI keeps you on track</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (step.id === "plan-authority") {
      return (
        <div className="plan-authority-wrap">
          <div className="benefits-card-unified">
            <div className="benefit-half without">
              <h4 className="benefit-title">Without Fit AI</h4>
              <ul className="benefit-list">
                <li><span className="cross">✕</span> Tedious to track what you eat</li>
                <li><span className="cross">✕</span> Unclear how to reach your goals</li>
                <li><span className="cross">✕</span> Hard to stay motivated</li>
              </ul>
            </div>
            <div className="benefit-divider" />
            <div className="benefit-half with">
              <h4 className="benefit-title">With Fit AI</h4>
              <ul className="benefit-list">
                <li><span className="check">✓</span> Log food in seconds</li>
                <li><span className="check">✓</span> Clear daily targets to follow</li>
                <li><span className="check">✓</span> AI keeps you on track</li>
              </ul>
            </div>
          </div>

          <div className="trusted-card">
            <h3 className="trusted-title">Trusted by millions:</h3>
            <div className="trusted-row">
              <div className="trusted-col">
                <div className="laurel-wreath">
                  <span className="wreath-icon">🌿</span>
                  <span className="trusted-bold">10M+</span>
                  <span className="wreath-icon">🌿</span>
                </div>
                <span className="stat-sub">users</span>
              </div>
              <div className="trusted-col">
                <div className="rating-stars-row">
                  <span className="trusted-score">4.8</span>
                  <span className="stars">★★★★★</span>
                </div>
                <span className="stat-sub">250K+ App Ratings</span>
              </div>
            </div>
          </div>

          <div className="seen-card">
            <h4 className="seen-title">As seen in:</h4>
            <div className="press-logos">
              <span className="press-logo">abc</span>
              <span className="press-logo">CBS</span>
              <span className="press-logo">Forbes</span>
              <span className="press-logo">TC</span>
              <span className="press-logo">Entrepreneur</span>
              <span className="press-logo">THE TIMES</span>
            </div>
          </div>

          <div className="plan-footnote">
            <span>ⓘ</span>
            <span>How we make recommendations</span>
          </div>
        </div>
      );
    }

    // Insight step
    return (
      <div className="insight-panel">
        <div className="insight-copy-card">
          <p className="eyebrow">{step.id === "goal-insight" ? "YOUR GOAL, FIRST" : "PERSONALIZED FOR YOU"}</p>
          <h2>{step.title}</h2>
          <p>{step.subtitle}</p>
          <div className="insight-points">
            <div className="insight-point">
              <span aria-hidden="true">✓</span>
              <span>An estimate shaped by your personal details</span>
            </div>
            <div className="insight-point">
              <span aria-hidden="true">✓</span>
              <span>Simple daily calorie and macronutrient targets</span>
            </div>
            <div className="insight-point">
              <span aria-hidden="true">✓</span>
              <span>Flexible guidance that adapts to your routine</span>
            </div>
          </div>
        </div>
        <div className="insight-visual-card">
          <div className="insight-orbit">
            <span style={{ fontSize: 32 }} aria-hidden="true">{ICONS.sparkles}</span>
          </div>
          <p className="insight-visual-label">A sustainable starting point is better than a rigid plan you cannot follow.</p>
        </div>
      </div>
    );
  }

  const isCustomStep =
    step.id === "weight-insight" ||
    step.id === "plan-social-proof" ||
    step.id === "plan-recommendation" ||
    step.id === "plan-strategy" ||
    step.id === "plan-authority";

  const buttonLabel = busy
    ? "Saving securely…"
    : step.id === "rollover"
    ? "Build my plan"
    : isLastStep
    ? "Start with Fit AI"
    : "Continue";

  return (
    <div className="flow-shell">
      <header className="flow-header">
        <button
          className="back-button"
          type="button"
          onClick={goBack}
          aria-label={currentIndex === 0 ? "Back to sign in" : "Previous step"}
        >
          <span style={{ fontSize: 22, fontWeight: 700 }}>‹</span>
        </button>
        <div className="flow-progress-block" aria-live="polite">
          <div className="flow-progress-meta">
            <span>YOUR PLAN</span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={flow.length}
            aria-valuenow={currentIndex + 1}
            aria-label="Onboarding progress"
          >
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <div className="flow-header-brand">
          <BrandLogo />
        </div>
      </header>

      <main className="flow-main" key={step.id}>
        <section aria-labelledby="step-title">
          {step.type === "insight" && !isCustomStep ? <p className="eyebrow">GUIDING PRINCIPLES</p> : null}
          {!isCustomStep ? (
            <>
              <h1 id="step-title">{step.title}</h1>
              <p className="flow-subtitle">{step.subtitle}</p>
            </>
          ) : null}
          <div className="question-content">{renderStepBody()}</div>
        </section>
      </main>

      <footer className="flow-footer">
        <div className="flow-footer-inner">
          {error ? <p className="auth-error" role="alert" style={{ marginBottom: 8 }}>{error}</p> : null}
          <button
            className="btn full-width"
            type="button"
            onClick={advance}
            disabled={!isStepValid(step, answers) || busy}
          >
            {buttonLabel}
            {!busy ? <span style={{ marginLeft: 6 }}>→</span> : null}
          </button>
        </div>
      </footer>
    </div>
  );
}
