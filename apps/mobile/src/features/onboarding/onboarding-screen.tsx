import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MobileWheelDatePicker, type WheelDateValue } from "./wheel-date-picker";
import { calculateUserPlan } from "./plan-calc";
import {
  getAgeYears,
  getVisibleFlow,
  isStepValid,
  questionnaireFlow,
  setSingleAnswer,
  toggleMultiAnswer,
  type QuestionnaireAnswers,
  type QuestionnaireStep,
  type QuestionnaireStepId,
  type QuestionOption
} from "./questionnaire";

const COLORS = {
  ink: "#211F25",
  muted: "#85838A",
  line: "#EAE9ED",
  surface: "#F8F7FB",
  white: "#FFFFFF",
  accent: "#D99C79",
  soft: "#F3F2F6",
  error: "#BE5E64"
} as const;

const ICONS: Record<string, string> = {
  arrowDown: "↓", minus: "−", arrowUp: "↑", male: "♂", female: "♀",
  person: "◉", walk: "↗", activity: "⌁", bolt: "ϟ", clock: "◷",
  dumbbell: "◇", plate: "◉", leaf: "♧", sprout: "♣", fish: "≈",
  olive: "●", drumstick: "◈", fork: "⋔", sparkles: "✦", heart: "♡",
  target: "◎", bell: "♧", moon: "☾", calendar: "▦", refresh: "↻",
  chart: "▥", users: "◉", check: "✓"
};

type OnboardingScreenProps = Readonly<{
  initialAnswers?: QuestionnaireAnswers;
  onComplete: (answers: QuestionnaireAnswers) => void | Promise<void>;
  onSignOut?: () => void;
  onBackToWelcome?: () => void;
}>;

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

function ChoiceCard({ option, selected, onPress, grid = false }: {
  option: QuestionOption;
  selected: boolean;
  onPress: () => void;
  grid?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={[option.title, option.description].filter(Boolean).join(". ")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choiceCard,
        grid && styles.gridCard,
        selected && styles.choiceSelected,
        pressed && styles.pressed
      ]}
    >
      <View style={styles.choiceIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={styles.choiceIconText}>{ICONS[option.icon] ?? "✦"}</Text>
      </View>
      <View style={styles.choiceCopy}>
        <Text style={styles.choiceTitle}>{option.title}</Text>
        {option.description ? <Text style={styles.choiceDescription}>{option.description}</Text> : null}
        {option.recommended ? <Text style={styles.recommended}>RECOMMENDED</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

function ChoiceChip({ option, selected, onPress }: {
  option: QuestionOption;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={option.title}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {selected ? <Text style={[styles.chipCheck, selected && styles.chipCheckSelected]}>✓</Text> : null}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.title}</Text>
    </Pressable>
  );
}

function UnitSwitch<T extends string>({ choices, value, onChange }: {
  choices: readonly [T, T];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.unitSwitch} accessibilityRole="radiogroup">
      {choices.map((choice) => {
        const selected = choice === value;
        return (
          <Pressable
            key={choice}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(choice)}
            style={[styles.unitButton, selected && styles.unitButtonSelected]}
          >
            <Text style={[styles.unitText, selected && styles.unitTextSelected]}>{choice}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ValueSlider({ label, value, minimum, maximum, step, suffix, onChange }: {
  label: string;
  value?: number;
  minimum: number;
  maximum: number;
  step: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const [left, setLeft] = useState(0);
  const trackRef = useRef<View>(null);
  const boundedValue = Math.min(maximum, Math.max(minimum, value ?? (minimum + maximum) / 2));
  const percentage = ((boundedValue - minimum) / (maximum - minimum)) * 100;
  const responder = useMemo(() => {
    const positionFromX = (x: number) => {
      const ratio = Math.min(1, Math.max(0, (x - left) / Math.max(width, 1)));
      const raw = minimum + ratio * (maximum - minimum);
      return Math.min(maximum, Math.max(minimum, Math.round(raw / step) * step));
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => onChange(positionFromX(event.nativeEvent.pageX)),
      onPanResponderMove: (event) => onChange(positionFromX(event.nativeEvent.pageX))
    });
  }, [left, maximum, minimum, onChange, step, width]);

  const shownValue = value === undefined ? `Select ${label.toLowerCase()}` : `${formatValue(value)} ${suffix}`;
  return (
    <View style={styles.metricPanel}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue} accessibilityLiveRegion="polite">{shownValue}</Text>
      </View>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: minimum, max: maximum, now: value ?? minimum }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => onChange(Math.min(maximum, Math.max(minimum, (value ?? minimum) + (event.nativeEvent.actionName === "increment" ? step : -step))))}
        style={styles.sliderTouchArea}
        {...responder.panHandlers}
      >
        <View
          ref={trackRef}
          onLayout={(event) => {
            setWidth(event.nativeEvent.layout.width);
            trackRef.current?.measureInWindow((x) => setLeft(x));
          }}
          style={styles.sliderTrack}
        >
          <View style={[styles.sliderFill, { width: `${percentage}%` }]} />
          <View style={[styles.sliderThumb, { left: `${percentage}%` }]} />
        </View>
        <View style={styles.ruler} accessibilityElementsHidden>
          {Array.from({ length: 25 }, (_, index) => (
            <View key={index} style={[styles.rulerTick, index % 4 === 0 && styles.rulerMajorTick]} />
          ))}
        </View>
      </View>
      <View style={styles.sliderEndpoints}>
        <Text style={styles.endpoint}>{formatValue(minimum)} {suffix}</Text>
        <Text style={styles.endpoint}>{formatValue(maximum)} {suffix}</Text>
      </View>
    </View>
  );
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function displayHeight(cm: number | undefined, unit: "cm" | "ft / in"): string {
  if (cm === undefined) return "Select height";
  if (unit === "cm") return `${Math.round(cm)} cm`;
  const inches = Math.round(cm / 2.54);
  return `${Math.floor(inches / 12)}′ ${inches % 12}″`;
}

function displayWeight(kg: number | undefined, unit: "kg" | "lb"): string {
  if (kg === undefined) return "Select weight";
  return `${(unit === "lb" ? kg * 2.20462262 : kg).toFixed(1)} ${unit}`;
}



function getInsight(step: QuestionnaireStep, answers: QuestionnaireAnswers) {
  if (step.id === "goal-insight") {
    const goal = answers.goal;
    const content = goal === "lose"
      ? ["Progress without the all-or-nothing.", "We’ll estimate a moderate calorie target and focus on habits you can repeat—not crash-diet rules."]
      : goal === "gain"
        ? ["Fuel the progress you want to make.", "We’ll estimate a modest energy surplus and make room for meals and snacks that suit your routine."]
        : ["Keep your routine feeling balanced.", "We’ll estimate a maintenance starting point and help you build a steady, balanced routine."];
    return {
      kicker: "YOUR GOAL, FIRST",
      title: content[0],
      body: content[1],
      points: ["An estimate shaped by your personal details", "Simple daily calorie and macro targets", "Room to adjust as you learn what works"],
      icon: "target",
      visual: "A useful starting point is better than a perfect plan you can’t follow."
    };
  }
  const firstBarrier = answers.barriers?.[0];
  const barrierText = firstBarrier === "busy"
    ? "We’ll keep quick, low-friction ideas in mind for busy days."
    : firstBarrier === "inspiration"
      ? "We’ll make food ideas easier to find when inspiration runs low."
      : firstBarrier === "consistency"
        ? "Small check-ins can make it easier to build a steady rhythm."
        : firstBarrier === "forgetting"
          ? "Quick logging can help make meal tracking less of a chore."
          : "Your food preferences and routine can guide the ideas FITAI surfaces.";
  return {
    kicker: "PERSONALIZED FOR YOU",
    title: "Good guidance should fit your day.",
    body: barrierText,
    points: [
      "Log food in a few taps or with a meal description",
      "See calories, protein, carbs, and fats in one place",
      "Use flexible targets—not pass or fail rules"
    ],
    icon: "sparkles",
    visual: `Your ${answers.diet ? answers.diet.replace("-", " ") : "flexible"} eating style and daily rhythm will guide your plan.`
  };
}

export function OnboardingScreen({ initialAnswers, onComplete, onSignOut, onBackToWelcome }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(() => initialAnswers ?? { allergies: [], health: [], foodPrefs: [], barriers: [] });
  const [stepId, setStepId] = useState<QuestionnaireStepId>("goal");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "ft / in">("cm");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [transition] = useState(() => new Animated.Value(1));

  const flow = getVisibleFlow(answers);
  const currentIndex = Math.max(0, flow.findIndex((step) => step.id === stepId));
  const step = flow[currentIndex] ?? questionnaireFlow[0];
  const progress = ((currentIndex + 1) / flow.length) * 100;
  const isLastStep = currentIndex === flow.length - 1;
  const narrow = screenWidth < 380;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      transition.setValue(1);
      return;
    }
    transition.setValue(0);
    Animated.timing(transition, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [reduceMotion, stepId, transition]);

  function changeAnswer(next: QuestionnaireAnswers) {
    setAnswers(next);
    setError("");
  }

  async function advance() {
    if (!isStepValid(step, answers)) {
      setError(step.id === "dob" ? "Enter a valid date of birth to continue." : "Choose an answer to continue.");
      return;
    }
    setError("");
    if (!isLastStep) {
      setStepId(flow[currentIndex + 1].id);
      return;
    }
    try {
      setSubmitting(true);
      await onComplete(answers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    setError("");
    if (currentIndex > 0) setStepId(flow[currentIndex - 1].id);
  }



  function renderOptions(options: readonly QuestionOption[], selectedValue?: string) {
    return (
      <View style={[styles.optionList, step.grid && !narrow && styles.optionGrid]}>
        {options.map((option) => (
          <ChoiceCard
            key={option.value}
            option={option}
            selected={selectedValue === option.value}
            grid={Boolean(step.grid && !narrow)}
            onPress={() => {
              if (!step.key) return;
              changeAnswer(setSingleAnswer(answers, step.id, option.value));
            }}
          />
        ))}
      </View>
    );
  }

  function renderBody() {
    if (step.type === "single") return renderOptions(step.options ?? [], selectSingle(answers, step.id));
    if (step.type === "multi") {
      const selected = selectMulti(answers, step.id);
      return (
        <View>
          <Text style={styles.multiLabel}>✓  Choose any that apply</Text>
          <View style={styles.chipGrid}>
            {(step.options ?? []).map((option) => (
              <ChoiceChip
                key={option.value}
                option={option}
                selected={selected.includes(option.value)}
                onPress={() => {
                  if (!step.key) return;
                  const exclusiveValues = step.id === "health" ? ["none", "prefer-not"] : step.noneValue ? [step.noneValue] : [];
                  changeAnswer(setMultiAnswer(answers, step.id, toggleMultiAnswer(selected, option.value, exclusiveValues)));
                }}
              />
            ))}
          </View>
          {step.id === "allergies" ? <Text style={styles.note}>Food tracking cannot guarantee allergen safety. Check packaging and restaurant information every time.</Text> : null}
        </View>
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
        <View>
          <MobileWheelDatePicker
            value={wheelValue}
            onChange={(next) => {
              const mm = String(next.month).padStart(2, "0");
              const dd = String(next.day).padStart(2, "0");
              changeAnswer({ ...answers, birthDate: `${next.year}-${mm}-${dd}` });
            }}
          />
          <Text style={styles.note}>Your birth date is protected and used to calculate your personalized nutrition baseline.</Text>
        </View>
      );
    }
    if (step.type === "height") {
      const shown = displayHeight(answers.heightCm, heightUnit);
      const height = answers.heightCm;
      return (
        <View>
          <View style={styles.measurementHeader}>
            <View><Text style={styles.metricLabel}>Height</Text><Text style={styles.metricValue}>{shown}</Text></View>
            <UnitSwitch choices={["cm", "ft / in"]} value={heightUnit} onChange={setHeightUnit} />
          </View>
          <ValueSlider label="Height in centimeters" value={height} minimum={120} maximum={220} step={1} suffix="cm" onChange={(heightCm) => changeAnswer({ ...answers, heightCm })} />
          <Text style={styles.note}>Slide to adjust. Your height is used only to estimate nutrition needs.</Text>
        </View>
      );
    }
    if (step.type === "weight") {
      return (
        <View>
          <View style={styles.measurementHeader}>
            <View><Text style={styles.metricLabel}>Current weight</Text><Text style={styles.metricValue}>{displayWeight(answers.weightKg, weightUnit)}</Text></View>
            <UnitSwitch choices={["kg", "lb"]} value={weightUnit} onChange={setWeightUnit} />
          </View>
          <ValueSlider
            label="Current weight"
            value={answers.weightKg === undefined ? undefined : weightUnit === "lb" ? answers.weightKg * 2.20462262 : answers.weightKg}
            minimum={weightUnit === "lb" ? 35 * 2.20462262 : 35}
            maximum={weightUnit === "lb" ? 180 * 2.20462262 : 180}
            step={0.1}
            suffix={weightUnit}
            onChange={(value) => changeAnswer({ ...answers, weightKg: weightUnit === "lb" ? value / 2.20462262 : value })}
          />
          <Text style={styles.note}>Your current weight is a starting estimate, not a judgment. You can update it later.</Text>
        </View>
      );
    }
    if (step.type === "goal-weight") {
      const current = answers.weightKg;
      if (current === undefined) return <Text style={styles.safetyNote}>Select your current weight first to continue.</Text>;
      const losing = answers.goal === "lose";
      const minimum = losing ? Math.max(30, current - 35) : current;
      const maximum = losing ? current : Math.min(220, current + 35);
      return (
        <View>
          <View style={styles.measurementHeader}>
            <View>
              <Text style={styles.metricLabel}>Goal weight</Text>
              <Text style={styles.metricValue}>{displayWeight(answers.goalWeightKg, weightUnit)}</Text>
            </View>
            <UnitSwitch choices={["kg", "lb"]} value={weightUnit} onChange={setWeightUnit} />
          </View>
          <ValueSlider
            label="Goal weight"
            value={answers.goalWeightKg === undefined ? undefined : weightUnit === "lb" ? answers.goalWeightKg * 2.20462262 : answers.goalWeightKg}
            minimum={weightUnit === "lb" ? minimum * 2.20462262 : minimum}
            maximum={weightUnit === "lb" ? maximum * 2.20462262 : maximum}
            step={0.1}
            suffix={weightUnit}
            onChange={(value) => changeAnswer({ ...answers, goalWeightKg: weightUnit === "lb" ? value / 2.20462262 : value })}
          />
          <Text style={styles.note}>A healthy plan should support steady progress. You can edit your goal at any time.</Text>
        </View>
      );
    }
    if (step.type === "pace") {
      const gainOptions: QuestionOption[] = [
        { value: "0.15", title: "Gentle", description: "About 0.15 kg per week", icon: "walk" },
        { value: "0.25", title: "Steady", description: "About 0.25 kg per week", icon: "activity", recommended: true },
        { value: "0.35", title: "Faster", description: "About 0.35 kg per week", icon: "bolt" }
      ];
      const loseOptions: QuestionOption[] = [
        { value: "0.25", title: "Gentle", description: "About 0.25 kg per week", icon: "walk" },
        { value: "0.4", title: "Steady", description: "About 0.4 kg per week", icon: "activity", recommended: true },
        { value: "0.5", title: "Faster", description: "About 0.5 kg per week", icon: "bolt" }
      ];
      const options = answers.goal === "gain" ? gainOptions : loseOptions;
      return (
        <View>
          {renderOptions(options, answers.paceKgPerWeek === undefined ? undefined : String(answers.paceKgPerWeek))}
          <Text style={styles.note}>The estimated pace is a guide—not a promise or a substitute for professional advice.</Text>
        </View>
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
        <View style={styles.weightInsightWrap}>
          <Text style={styles.weightInsightTitle}>
            {diffKg === 0 ? (
              "Maintaining your weight is a realistic target. It's not hard at all!"
            ) : (
              <>
                {action}{" "}
                <Text style={styles.weightInsightAccent}>{diffFormatted}</Text>
                {" "}is a realistic target. It's not hard at all!
              </>
            )}
          </Text>
          <Text style={styles.weightInsightSubtitle}>
            90% of users say that the change is obvious after using Fit AI and it is not easy to rebound.
          </Text>
        </View>
      );
    }

    if (step.id === "plan-social-proof") {
      return (
        <View style={styles.planProofWrap}>
          <Text style={styles.planProofHeading}>Join over 10 million people like you</Text>

          <View style={styles.planProofStatsRow}>
            <View style={styles.proofBadge}>
              <View style={styles.laurelRow}>
                <Text style={styles.wreathEmoji}>🌿</Text>
                <Text style={styles.ratingScore}>4.8 ★</Text>
                <Text style={styles.wreathEmoji}>🌿</Text>
              </View>
              <Text style={styles.statSub}>avg rating</Text>
              <Text style={styles.statCount}>300K+ App Ratings</Text>
            </View>

            <View style={styles.proofBadge}>
              <View style={styles.avatarCluster}>
                <View style={[styles.clusterAvatar, { backgroundColor: "#DDE3F0" }]}><Text style={styles.clusterEmoji}>👨‍💼</Text></View>
                <View style={[styles.clusterAvatar, { backgroundColor: "#F3DFD5", marginLeft: -10 }]}><Text style={styles.clusterEmoji}>👩‍🦰</Text></View>
                <View style={[styles.clusterAvatar, { backgroundColor: "#E6D7EE", marginLeft: -10 }]}><Text style={styles.clusterEmoji}>👨‍🎓</Text></View>
              </View>
              <Text style={styles.statCount}>10M+ Fit AI Users</Text>
            </View>
          </View>

          <View style={styles.testimonialCards}>
            <View style={styles.testimonialCard}>
              <View style={styles.testimonialHeader}>
                <Text style={styles.starsText}>★★★★★</Text>
                <View style={styles.authorTag}>
                  <View style={styles.authorAvatar}><Text style={styles.authorAvatarText}>👨‍💻</Text></View>
                  <Text style={styles.authorName}>Jake Sullivan</Text>
                </View>
              </View>
              <Text style={styles.testimonialBody}>
                "I lost 15 lbs in 2 months! I was about to go on Ozempic but decided to give this app a shot and it worked :)"
              </Text>
            </View>

            <View style={styles.testimonialCard}>
              <View style={styles.testimonialHeader}>
                <Text style={styles.starsText}>★★★★★</Text>
                <View style={styles.authorTag}>
                  <View style={styles.authorAvatar}><Text style={styles.authorAvatarText}>🧔</Text></View>
                  <Text style={styles.authorName}>Benny Marcs</Text>
                </View>
              </View>
              <Text style={styles.testimonialBody}>
                "The time I have saved not weighing my food has allowed me to start trading stocks during the day."
              </Text>
            </View>
          </View>
        </View>
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
        <View style={styles.recWrap}>
          <View style={styles.recHeader}>
            <Text style={styles.recTitle}>Your daily recommendation</Text>
            <Text style={styles.recSubtitle}>You can edit this anytime</Text>
          </View>

          <View style={styles.recCalorieCard}>
            <View style={styles.recCalLeft}>
              <View style={styles.recCalIconWrap}><Text style={styles.recCalIcon}>🔥</Text></View>
              <View>
                <Text style={styles.recCalNumber}>{p.targets.calories.toLocaleString()}</Text>
                <Text style={styles.recCalLabel}>Calories</Text>
              </View>
            </View>
            <Text style={styles.recEditIcon}>✏️</Text>
          </View>

          <View style={styles.recMacrosRow}>
            <View style={styles.recMacroCard}>
              <View style={styles.macroTopRow}><Text style={styles.macroEmoji}>🍗</Text><Text style={styles.macroEdit}>✏️</Text></View>
              <Text style={styles.macroVal}>{p.targets.proteinGrams}g</Text>
              <Text style={styles.macroName}>Protein</Text>
            </View>

            <View style={styles.recMacroCard}>
              <View style={styles.macroTopRow}><Text style={styles.macroEmoji}>🌾</Text><Text style={styles.macroEdit}>✏️</Text></View>
              <Text style={styles.macroVal}>{p.targets.carbsGrams}g</Text>
              <Text style={styles.macroName}>Carbs</Text>
            </View>

            <View style={styles.recMacroCard}>
              <View style={styles.macroTopRow}><Text style={styles.macroEmoji}>🥑</Text><Text style={styles.macroEdit}>✏️</Text></View>
              <Text style={styles.macroVal}>{p.targets.fatGrams}g</Text>
              <Text style={styles.macroName}>Fats</Text>
            </View>
          </View>

          <View style={styles.recInfoCard}>
            <Text style={styles.infoTitle}>Your info</Text>
            <Text style={styles.infoSubtitle}>This plan is customized for you.</Text>

            <View style={styles.infoRows}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👤</Text>
                <Text style={styles.infoText}>Your weight: <Text style={styles.infoBold}>{p.currentWeightKg.toFixed(1)} kg</Text></Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🚩</Text>
                <Text style={styles.infoText}>Goal weight: <Text style={styles.infoBold}>{goalWeightText}</Text></Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🏃</Text>
                <Text style={styles.infoText}>Activity level: <Text style={styles.infoBold}>{p.activityLabel}</Text></Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🎯</Text>
                <Text style={styles.infoText}>
                  Target: <Text style={styles.infoBold}>{targetLabel}</Text>
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.recPreviewCard}>
            <Text style={styles.previewHeading}>How to reach your goals:</Text>
            <View style={styles.previewItem}>
              <Text style={styles.previewIcon}>💖</Text>
              <Text style={styles.previewText}>Get your weekly life score and improve your routine.</Text>
            </View>
          </View>
        </View>
      );
    }

    if (step.id === "plan-strategy") {
      return (
        <View style={styles.strategyWrap}>
          <Text style={styles.strategyHeading}>How to reach your goals:</Text>
          <View style={styles.strategyCards}>
            <View style={styles.strategyCard}>
              <Text style={styles.strategyIcon}>💖</Text>
              <Text style={styles.strategyText}>Get your weekly life score and improve your routine.</Text>
            </View>
            <View style={styles.strategyCard}>
              <Text style={styles.strategyIcon}>🥑</Text>
              <Text style={styles.strategyText}>Track your food</Text>
            </View>
            <View style={styles.strategyCard}>
              <Text style={styles.strategyIcon}>⏱️</Text>
              <Text style={styles.strategyText}>Follow your daily calorie recommendation</Text>
            </View>
            <View style={styles.strategyCard}>
              <Text style={styles.strategyIcon}>🌾</Text>
              <Text style={styles.strategyText}>Balance your carbs, protein, fat</Text>
            </View>
          </View>

          <Text style={[styles.strategyHeading, { marginTop: 24 }]}>Benefits with Fit AI:</Text>
          <View style={styles.benefitCards}>
            <View style={[styles.benefitCard, styles.benefitWithout]}>
              <Text style={styles.benefitTitleWithout}>Without Fit AI</Text>
              <Text style={styles.benefitRow}><Text style={styles.crossText}>✕ </Text>Tedious to track what you eat</Text>
              <Text style={styles.benefitRow}><Text style={styles.crossText}>✕ </Text>Unclear how to reach your goals</Text>
              <Text style={styles.benefitRow}><Text style={styles.crossText}>✕ </Text>Hard to stay motivated</Text>
            </View>

            <View style={[styles.benefitCard, styles.benefitWith]}>
              <Text style={styles.benefitTitleWith}>With Fit AI</Text>
              <Text style={styles.benefitRow}><Text style={styles.checkText}>✓ </Text>Log food in seconds</Text>
              <Text style={styles.benefitRow}><Text style={styles.checkText}>✓ </Text>Clear daily targets to follow</Text>
              <Text style={styles.benefitRow}><Text style={styles.checkText}>✓ </Text>AI keeps you on track</Text>
            </View>
          </View>
        </View>
      );
    }

    if (step.id === "plan-authority") {
      return (
        <View style={styles.authorityWrap}>
          <View style={styles.benefitCards}>
            <View style={[styles.benefitCard, styles.benefitWithout]}>
              <Text style={styles.benefitTitleWithout}>Without Fit AI</Text>
              <Text style={styles.benefitRow}><Text style={styles.crossText}>✕ </Text>Tedious to track what you eat</Text>
              <Text style={styles.benefitRow}><Text style={styles.crossText}>✕ </Text>Unclear how to reach your goals</Text>
              <Text style={styles.benefitRow}><Text style={styles.crossText}>✕ </Text>Hard to stay motivated</Text>
            </View>

            <View style={[styles.benefitCard, styles.benefitWith]}>
              <Text style={styles.benefitTitleWith}>With Fit AI</Text>
              <Text style={styles.benefitRow}><Text style={styles.checkText}>✓ </Text>Log food in seconds</Text>
              <Text style={styles.benefitRow}><Text style={styles.checkText}>✓ </Text>Clear daily targets to follow</Text>
              <Text style={styles.benefitRow}><Text style={styles.checkText}>✓ </Text>AI keeps you on track</Text>
            </View>
          </View>

          <View style={styles.trustedCard}>
            <Text style={styles.trustedTitle}>Trusted by millions:</Text>
            <View style={styles.trustedRow}>
              <View style={styles.trustedCol}>
                <Text style={styles.wreathEmoji}>🌿 <Text style={styles.trustedBold}>10M+</Text> 🌿</Text>
                <Text style={styles.statSub}>users</Text>
              </View>
              <View style={styles.trustedCol}>
                <Text style={styles.trustedBold}>4.8 ★★★★★</Text>
                <Text style={styles.statSub}>250K+ App Ratings</Text>
              </View>
            </View>
          </View>

          <View style={styles.seenCard}>
            <Text style={styles.seenTitle}>As seen in:</Text>
            <View style={styles.pressLogosRow}>
              <Text style={styles.pressLogo}>abc</Text>
              <Text style={styles.pressLogo}>CBS</Text>
              <Text style={styles.pressLogo}>Forbes</Text>
              <Text style={styles.pressLogo}>TC</Text>
              <Text style={styles.pressLogo}>Entrepreneur</Text>
              <Text style={styles.pressLogo}>THE TIMES</Text>
            </View>
          </View>

          <View style={styles.planFootnote}>
            <Text style={styles.footnoteText}>ⓘ How we make recommendations</Text>
          </View>
        </View>
      );
    }

    const insight = getInsight(step, answers);
    return (
      <View style={styles.insightLayout}>
        <View style={styles.insightCard}>
          <Text style={styles.eyebrow}>{insight.kicker}</Text>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightBody}>{insight.body}</Text>
          <View style={styles.insightPoints}>
            {insight.points.map((point) => (
              <View key={point} style={styles.insightPoint}>
                <Text style={styles.pointCheck}>✓</Text>
                <Text style={styles.insightBody}>{point}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.insightVisual}>
          <View style={styles.orbit}><Text style={styles.orbitIcon}>{ICONS[insight.icon]}</Text></View>
          <Text style={styles.visualLabel}>{insight.visual}</Text>
          <View style={styles.miniProgress}><View style={styles.miniProgressFill} /></View>
        </View>
      </View>
    );
  }

  const opacity = transition;
  const translateY = transition.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });

  const isCustomStep =
    step.id === "weight-insight" ||
    step.id === "plan-social-proof" ||
    step.id === "plan-recommendation" ||
    step.id === "plan-strategy" ||
    step.id === "plan-authority";

  const buttonLabel =
    step.id === "rollover"
      ? "Build my plan"
      : isLastStep
      ? "Start with Fit AI"
      : "Continue";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous step"
            disabled={currentIndex === 0 && !onBackToWelcome}
            onPress={currentIndex === 0 ? onBackToWelcome : goBack}
            style={({ pressed }) => [
              styles.backButton,
              currentIndex === 0 && !onBackToWelcome && styles.backDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>
          <View style={styles.progressBlock}>
            <View style={styles.progressMeta}>
              <Text style={styles.progressCaption}>YOUR PLAN</Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 1, max: flow.length, now: currentIndex + 1 }}
              accessibilityLabel="Onboarding progress"
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          </View>
          <View style={styles.brandMark} accessibilityLabel="FITAI">
            <Text style={styles.brandLetter}>F</Text>
          </View>
        </View>

        <Animated.View style={[styles.flex, { opacity, transform: [{ translateY }] }]}>
          <ScrollView
            key={step.id}
            style={styles.flex}
            scrollEnabled={step.type !== "date"}
            contentContainerStyle={[styles.main, { paddingHorizontal: narrow ? 20 : 25 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            showsVerticalScrollIndicator={false}
          >
            {step.type === "insight" && !isCustomStep ? (
              <Text style={styles.eyebrow}>{step.id === "goal-insight" ? "YOUR GOAL, FIRST" : "PERSONALIZED FOR YOU"}</Text>
            ) : null}
            {!isCustomStep ? (
              <>
                <Text accessibilityRole="header" style={styles.heading}>{step.title}</Text>
                <Text style={styles.subtitle}>{step.subtitle}</Text>
              </>
            ) : null}
            <View style={styles.questionContent}>{renderBody()}</View>
          </ScrollView>
        </Animated.View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={buttonLabel}
            disabled={!isStepValid(step, answers) || submitting}
            onPress={advance}
            style={({ pressed }) => [
              styles.continueButton,
              (!isStepValid(step, answers) || submitting) && styles.continueDisabled,
              pressed && styles.pressed
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Text style={styles.continueText}>{buttonLabel}</Text>
                <Text style={styles.continueArrow}>→</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  flex: { flex: 1 },
  header: {
    height: 72,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.line,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.soft, alignItems: "center", justifyContent: "center" },
  backDisabled: { opacity: 0.35 },
  backArrow: { fontSize: 34, lineHeight: 38, color: COLORS.ink, marginTop: -4 },
  progressBlock: { flex: 1, gap: 8 },
  progressMeta: { flexDirection: "row", justifyContent: "space-between" },
  progressCaption: { color: "#AAA7AF", fontSize: 9, fontWeight: "700", letterSpacing: 1.2 },
  progressTrack: { height: 7, borderRadius: 7, overflow: "hidden", backgroundColor: "#EEEDEF" },
  progressFill: { height: "100%", borderRadius: 7, backgroundColor: COLORS.ink },
  brandMark: { width: 31, height: 31, borderRadius: 11, backgroundColor: COLORS.ink, alignItems: "center", justifyContent: "center" },
  brandLetter: { color: COLORS.white, fontSize: 19, fontWeight: "800" },
  main: { flexGrow: 1, paddingTop: 34, paddingBottom: 32, width: "100%", maxWidth: 800, alignSelf: "center" },
  eyebrow: { color: "#A09DA5", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  heading: { marginTop: 11, marginBottom: 11, color: COLORS.ink, fontSize: 36, lineHeight: 40, fontWeight: "800", letterSpacing: -1.6 },
  subtitle: { color: COLORS.muted, fontSize: 15, lineHeight: 23 },
  questionContent: { marginTop: 28, gap: 16 },
  optionList: { gap: 11 },
  optionGrid: { flexDirection: "row", flexWrap: "wrap" },
  choiceCard: {
    minHeight: 76,
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderWidth: 1.5,
    borderColor: COLORS.line,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  gridCard: { width: "48%", minHeight: 94, alignItems: "flex-start", gap: 8, paddingHorizontal: 10 },
  choiceSelected: { borderColor: COLORS.ink, borderWidth: 2 },
  pressed: { opacity: 0.82 },
  choiceIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  choiceIconText: { color: COLORS.ink, fontSize: 22, fontWeight: "600" },
  choiceCopy: { flex: 1, gap: 4 },
  choiceTitle: { color: COLORS.ink, fontSize: 15, lineHeight: 20, fontWeight: "600" },
  choiceDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 16 },
  recommended: { color: COLORS.accent, fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  radio: { width: 21, height: 21, borderWidth: 2, borderColor: "#D7D6DA", borderRadius: 11, alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: COLORS.ink, backgroundColor: COLORS.ink },
  radioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.white },
  multiLabel: { marginBottom: 12, color: "#96939B", fontSize: 12, fontWeight: "600" },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 24, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", gap: 7 },
  chipSelected: { backgroundColor: COLORS.ink, borderColor: COLORS.ink },
  chipText: { color: "#5E5A63", fontSize: 13, fontWeight: "600" },
  chipTextSelected: { color: COLORS.white },
  chipCheck: { color: COLORS.ink, fontSize: 13 },
  chipCheckSelected: { color: COLORS.white },
  note: { marginTop: 12, color: "#99969E", fontSize: 12, lineHeight: 18 },
  safetyNote: { padding: 16, borderRadius: 18, backgroundColor: COLORS.surface, color: COLORS.ink, fontSize: 13, lineHeight: 20 },
  dateFields: { flexDirection: "row", gap: 9, padding: 16, borderRadius: 22, backgroundColor: COLORS.surface },
  dateInput: { flex: 1, height: 54, borderWidth: 1, borderColor: COLORS.line, borderRadius: 14, backgroundColor: COLORS.white, color: COLORS.ink, textAlign: "center", fontSize: 16, fontWeight: "600" },
  yearInput: { flex: 1.4 },
  measurementHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  metricPanel: { marginTop: 14, paddingHorizontal: 8, paddingVertical: 22, borderRadius: 22, backgroundColor: COLORS.surface },
  metricHeader: { marginHorizontal: 10, marginBottom: 23 },
  metricLabel: { color: COLORS.muted, fontSize: 13, fontWeight: "600" },
  metricValue: { marginTop: 6, color: COLORS.ink, fontSize: 37, lineHeight: 43, fontWeight: "800", letterSpacing: -1.4 },
  unitSwitch: { flexDirection: "row", gap: 3, padding: 4, borderRadius: 24, backgroundColor: "#EFEDF2" },
  unitButton: { minHeight: 36, paddingHorizontal: 11, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  unitButtonSelected: { backgroundColor: COLORS.white },
  unitText: { color: "#89868E", fontSize: 11, fontWeight: "700" },
  unitTextSelected: { color: COLORS.ink },
  sliderTouchArea: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 6 },
  sliderTrack: { height: 5, marginTop: 20, borderRadius: 4, backgroundColor: "#E7E5EB" },
  sliderFill: { height: "100%", borderRadius: 4, backgroundColor: COLORS.ink },
  sliderThumb: { position: "absolute", top: -10, width: 25, height: 25, marginLeft: -12, borderWidth: 4, borderColor: COLORS.white, borderRadius: 14, backgroundColor: COLORS.ink, elevation: 2 },
  ruler: { height: 25, marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  rulerTick: { width: 1, height: 8, backgroundColor: "#C9C6CE" },
  rulerMajorTick: { height: 16, width: 2, backgroundColor: "#89858E" },
  sliderEndpoints: { marginTop: 8, paddingHorizontal: 11, flexDirection: "row", justifyContent: "space-between" },
  endpoint: { color: "#AAA7AF", fontSize: 11 },
  insightLayout: { gap: 14 },
  insightCard: { padding: 21, borderRadius: 23, backgroundColor: COLORS.surface },
  insightTitle: { marginTop: 11, marginBottom: 9, color: COLORS.ink, fontSize: 23, lineHeight: 28, fontWeight: "700", letterSpacing: -0.7 },
  insightBody: { color: COLORS.muted, fontSize: 14, lineHeight: 21, flexShrink: 1 },
  insightPoints: { marginTop: 18, gap: 12 },
  insightPoint: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  pointCheck: { color: COLORS.accent, fontSize: 16, fontWeight: "800" },
  insightVisual: { minHeight: 180, padding: 20, borderRadius: 23, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  orbit: { width: 72, height: 72, borderWidth: 8, borderColor: "#E9E5EF", borderRadius: 40, alignItems: "center", justifyContent: "center" },
  orbitIcon: { color: COLORS.ink, fontSize: 27 },
  visualLabel: { marginTop: 12, color: COLORS.muted, textAlign: "center", fontSize: 13, lineHeight: 19 },
  miniProgress: { width: "100%", height: 2, marginTop: 18, backgroundColor: "#D8D4DE" },
  miniProgressFill: { width: "64%", height: 2, backgroundColor: COLORS.accent },
  footer: { paddingTop: 13, paddingHorizontal: 19, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.line, backgroundColor: COLORS.white },
  error: { marginBottom: 8, color: COLORS.error, fontSize: 12, textAlign: "center" },
  continueButton: { minHeight: 56, paddingHorizontal: 22, borderRadius: 30, backgroundColor: COLORS.ink, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  continueDisabled: { opacity: 0.42 },
  continueText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  continueArrow: { color: COLORS.white, fontSize: 20 },
  weightInsightWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 44,
    paddingHorizontal: 8
  },
  weightInsightTitle: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: "800",
    color: COLORS.ink,
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 20
  },
  weightInsightAccent: {
    color: "#C9825B"
  },
  weightInsightSubtitle: {
    fontSize: 16,
    lineHeight: 25,
    color: "#55525C",
    textAlign: "center",
    maxWidth: 340
  },
  planProofWrap: { gap: 24, paddingVertical: 8 },
  planProofHeading: { fontSize: 32, lineHeight: 38, fontWeight: "800", color: COLORS.ink, letterSpacing: -1 },
  planProofStatsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  proofBadge: { flex: 1, alignItems: "center", justifyContent: "center" },
  laurelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  wreathEmoji: { fontSize: 18, color: "#C9825B" },
  ratingScore: { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  statSub: { fontSize: 12, color: "#8E8B94", marginTop: 4 },
  statCount: { fontSize: 12, fontWeight: "700", color: COLORS.ink, marginTop: 4 },
  avatarCluster: { flexDirection: "row", alignItems: "center" },
  clusterAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  clusterEmoji: { fontSize: 18 },
  testimonialCards: { gap: 14 },
  testimonialCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.line, gap: 10 },
  testimonialHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  starsText: { color: "#D98236", fontSize: 15, letterSpacing: 2 },
  authorTag: { flexDirection: "row", alignItems: "center", gap: 6 },
  authorAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#E4E0EA", alignItems: "center", justifyContent: "center" },
  authorAvatarText: { fontSize: 13 },
  authorName: { fontSize: 13, fontWeight: "700", color: COLORS.ink },
  testimonialBody: { fontSize: 14, lineHeight: 20, color: "#37353C" },
  recWrap: { gap: 16 },
  recHeader: { gap: 4 },
  recTitle: { fontSize: 26, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.8 },
  recSubtitle: { fontSize: 14, color: COLORS.muted },
  recCalorieCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: COLORS.line },
  recCalLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  recCalIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  recCalIcon: { fontSize: 22 },
  recCalNumber: { fontSize: 32, fontWeight: "800", color: COLORS.ink, letterSpacing: -1 },
  recCalLabel: { fontSize: 13, color: COLORS.muted },
  recEditIcon: { fontSize: 16, opacity: 0.6 },
  recMacrosRow: { flexDirection: "row", gap: 10 },
  recMacroCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.line, gap: 4 },
  macroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  macroEmoji: { fontSize: 18 },
  macroEdit: { fontSize: 12, opacity: 0.5 },
  macroVal: { fontSize: 20, fontWeight: "800", color: COLORS.ink, marginTop: 4 },
  macroName: { fontSize: 12, color: COLORS.muted },
  recInfoCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.line, gap: 8 },
  infoTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink },
  infoSubtitle: { fontSize: 13, color: COLORS.muted, marginBottom: 6 },
  infoRows: { gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoIcon: { fontSize: 16 },
  infoText: { fontSize: 14, color: "#48454F" },
  infoBold: { fontWeight: "700", color: COLORS.ink },
  recPreviewCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.line, gap: 10 },
  previewHeading: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  previewItem: { backgroundColor: COLORS.white, borderRadius: 14, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.line },
  previewIcon: { fontSize: 20 },
  previewText: { fontSize: 13, color: COLORS.ink, fontWeight: "600", flex: 1 },
  strategyWrap: { gap: 16 },
  strategyHeading: { fontSize: 20, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.5 },
  strategyCards: { gap: 10 },
  strategyCard: { backgroundColor: COLORS.white, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: COLORS.line, flexDirection: "row", alignItems: "center", gap: 14 },
  strategyIcon: { fontSize: 22 },
  strategyText: { fontSize: 14, fontWeight: "700", color: COLORS.ink, flex: 1 },
  benefitCards: { gap: 12 },
  benefitCard: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 8 },
  benefitWithout: { backgroundColor: "#FAF9FB", borderColor: "#ECE9F0" },
  benefitWith: { backgroundColor: "#F3FAF6", borderColor: "#D5EFE2" },
  benefitTitleWithout: { fontSize: 14, fontWeight: "800", color: "#6A6772", marginBottom: 2 },
  benefitTitleWith: { fontSize: 14, fontWeight: "800", color: "#16643B", marginBottom: 2 },
  benefitRow: { fontSize: 13, color: "#37353C", lineHeight: 18 },
  crossText: { color: "#C94848", fontWeight: "700" },
  checkText: { color: "#1CA657", fontWeight: "800" },
  authorityWrap: { gap: 16 },
  trustedCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.line, gap: 12 },
  trustedTitle: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  trustedRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  trustedCol: { flex: 1, alignItems: "center" },
  trustedBold: { fontSize: 16, fontWeight: "800", color: COLORS.ink },
  seenCard: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.line, gap: 12 },
  seenTitle: { fontSize: 14, fontWeight: "700", color: COLORS.muted },
  pressLogosRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 },
  pressLogo: { fontSize: 14, fontWeight: "900", color: "#8B8793", letterSpacing: 0.5 },
  planFootnote: { alignItems: "center", paddingVertical: 8 },
  footnoteText: { fontSize: 12, color: COLORS.muted }
});
