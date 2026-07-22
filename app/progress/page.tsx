import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { getAppPreferences } from "@/lib/preferences";
import type { AppLocale, WeightUnitPreference } from "@/lib/preferences-types";
import { filterStrengthExercises } from "@/lib/training/cardio-reserved";
import { ProgressView, type ProgressItem } from "./progress-view";

export const dynamic = "force-dynamic";

type ExerciseRow = {
  id: string;
  name: string;
};

type WorkoutSetRow = {
  created_at: string;
  exercise_id: string;
  reps: number;
  set_number: number;
  session_id: string;
  set_kind: "warmup" | "working";
  weight: number | string;
};

type WorkoutSessionRow = {
  id: string;
  workout_date: string;
};

type CardioExerciseRow = {
  category: string;
  id: string;
  name: string;
};

type CardioEntryRow = {
  cardio_date: string;
  cardio_exercise_id: string;
  calories: number | null;
};

type AggregateValue = {
  count: number;
  total: number;
};

type SetSummary = {
  createdAt: string;
  reps: number;
  setNumber: number;
  weight: number;
  workoutDate: string;
};

function formatPointLabel(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function buildAveragePoints(valuesByDate: Map<string, AggregateValue>, locale: AppLocale) {
  return Array.from(valuesByDate.entries())
    .toSorted(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, value]) => ({
      date,
      label: formatPointLabel(date, locale),
      value: Number((value.total / value.count).toFixed(1)),
    }));
}

function buildSumPoints(valuesByDate: Map<string, number>, locale: AppLocale) {
  return Array.from(valuesByDate.entries())
    .toSorted(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, value]) => ({
      date,
      label: formatPointLabel(date, locale),
      value,
    }));
}

function formatWeight(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function addAggregate(
  valuesByDate: Map<string, AggregateValue>,
  date: string,
  value: number,
) {
  const current = valuesByDate.get(date) ?? { count: 0, total: 0 };
  current.count += 1;
  current.total += value;
  valuesByDate.set(date, current);
}

function isBestSet(candidate: SetSummary, current: SetSummary | undefined) {
  if (!current) {
    return true;
  }

  if (candidate.weight !== current.weight) {
    return candidate.weight > current.weight;
  }

  if (candidate.reps !== current.reps) {
    return candidate.reps > current.reps;
  }

  if (candidate.workoutDate !== current.workoutDate) {
    return candidate.workoutDate > current.workoutDate;
  }

  if (candidate.createdAt !== current.createdAt) {
    return candidate.createdAt > current.createdAt;
  }

  return candidate.setNumber > current.setNumber;
}

function buildStrengthProgressItems({
  exercises,
  locale,
  sessionsById,
  weightUnit,
  workoutSets,
}: {
  exercises: ExerciseRow[];
  locale: AppLocale;
  sessionsById: Map<string, WorkoutSessionRow>;
  weightUnit: WeightUnitPreference;
  workoutSets: WorkoutSetRow[];
}): ProgressItem[] {
  const valuesByExercise = new Map<string, Map<string, AggregateValue>>();
  const bestSetByExercise = new Map<string, SetSummary>();

  workoutSets.forEach((set) => {
    if (set.set_kind !== "working") {
      return;
    }

    const session = sessionsById.get(set.session_id);
    const weight = Number(set.weight);

    if (!session || !Number.isFinite(weight) || !Number.isFinite(set.reps)) {
      return;
    }

    const summary: SetSummary = {
      createdAt: set.created_at,
      reps: set.reps,
      setNumber: set.set_number,
      weight,
      workoutDate: session.workout_date,
    };
    const valuesByDate = valuesByExercise.get(set.exercise_id) ?? new Map();
    addAggregate(valuesByDate, session.workout_date, weight);
    valuesByExercise.set(set.exercise_id, valuesByDate);

    if (isBestSet(summary, bestSetByExercise.get(set.exercise_id))) {
      bestSetByExercise.set(set.exercise_id, summary);
    }
  });

  return exercises.map((exercise) => {
    const conversion = weightUnit === "lb" ? 2.2046226218 : 1;
    const sourcePoints = valuesByExercise.get(exercise.id) ?? new Map();
    const convertedPoints = new Map(
      Array.from(sourcePoints.entries()).map(([date, value]) => [date, { count: value.count, total: value.total * conversion }]),
    );
    const points = buildAveragePoints(convertedPoints, locale);
    const bestSet = bestSetByExercise.get(exercise.id);

    return {
      emptyMessage: locale === "zh" ? "还没有工作组趋势数据。" : "No working-set trend yet.",
      id: `strength-${exercise.id}`,
      initial: getInitial(exercise.name),
      kind: "strength",
      metricMode: "average",
      metricLabel: locale === "zh" ? "平均工作组重量趋势" : "Average working-set weight over time",
      name: exercise.name,
      points,
      strengthSummary: {
        bestSet: bestSet
          ? {
              reps: bestSet.reps,
              weight: formatWeight(bestSet.weight * conversion),
            }
          : null,
      },
      unit: weightUnit,
    };
  });
}

function buildCardioProgressItems({
  cardioEntries,
  cardioExercises,
  locale,
}: {
  cardioEntries: CardioEntryRow[];
  cardioExercises: CardioExerciseRow[];
  locale: AppLocale;
}): ProgressItem[] {
  const valuesByExercise = new Map<string, Map<string, number>>();

  cardioEntries.forEach((entry) => {
    const calories = Number(entry.calories);

    if (!Number.isFinite(calories) || calories <= 0) {
      return;
    }

    const valuesByDate = valuesByExercise.get(entry.cardio_exercise_id) ?? new Map();
    valuesByDate.set(entry.cardio_date, (valuesByDate.get(entry.cardio_date) ?? 0) + calories);
    valuesByExercise.set(entry.cardio_exercise_id, valuesByDate);
  });

  return cardioExercises.map((exercise) => ({
    emptyMessage: locale === "zh" ? "还没有有氧热量趋势数据。" : "No cardio kcal trend yet.",
    id: `cardio-${exercise.id}`,
    initial: getInitial(exercise.name),
    kind: "cardio",
    metricMode: "cumulative",
    metricLabel: locale === "zh" ? "累计消耗热量趋势" : "Cumulative kcal consumed over time",
    name: exercise.name,
    points: buildSumPoints(valuesByExercise.get(exercise.id) ?? new Map(), locale),
    unit: "kcal",
  }));
}

export default async function ProgressPage() {
  await requireAuth("/progress");
  const preferences = await getAppPreferences();

  const supabase = await createClient();
  const exercisesResult = await supabase
    .from("exercises")
    .select("id, name")
    .order("name", { ascending: true });
  const workoutSetsResult = await supabase
    .from("workout_sets")
    .select("session_id, exercise_id, set_kind, weight, reps, set_number, created_at");
  const workoutSets = (workoutSetsResult.data ?? []) as WorkoutSetRow[];
  const sessionIds = Array.from(new Set(workoutSets.map((set) => set.session_id)));
  const sessionsResult = sessionIds.length
    ? await supabase
        .from("workout_sessions")
        .select("id, workout_date")
        .in("id", sessionIds)
    : { data: [], error: null };
  const sessions = (sessionsResult.data ?? []) as WorkoutSessionRow[];
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));
  const cardioExercisesResult = await supabase
    .from("cardio_exercises")
    .select("id, name, category")
    .order("name", { ascending: true });
  const cardioEntriesResult = await supabase
    .from("cardio_entries")
    .select("cardio_exercise_id, cardio_date, calories");

  const strengthItems = buildStrengthProgressItems({
    exercises: filterStrengthExercises((exercisesResult.data ?? []) as ExerciseRow[]),
    locale: preferences.locale,
    sessionsById,
    weightUnit: preferences.weightUnit,
    workoutSets,
  });
  const cardioItems =
    cardioExercisesResult.error || cardioEntriesResult.error
      ? []
      : buildCardioProgressItems({
          cardioEntries: (cardioEntriesResult.data ?? []) as CardioEntryRow[],
          cardioExercises: (cardioExercisesResult.data ?? []) as CardioExerciseRow[],
          locale: preferences.locale,
        });
  const items = [...strengthItems, ...cardioItems].toSorted((left, right) =>
    left.name.localeCompare(right.name),
  );
  const loadError =
    exercisesResult.error ||
    workoutSetsResult.error ||
    sessionsResult.error ||
    cardioExercisesResult.error ||
    cardioEntriesResult.error;

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow={preferences.locale === "zh" ? "训练进度" : "Progress"}
        title={preferences.locale === "zh" ? "个人训练进度" : "Personal Training Progress"}
        description={preferences.locale === "zh" ? "搜索并查看每个训练动作的长期趋势。" : "Search and review trends for each saved exercise over time."}
      >
        {loadError ? (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800"
            role="alert"
          >
            Some progress data is not available yet. Apply the cardio Supabase
            setup, then refresh this page.
          </div>
        ) : null}

        <ProgressView items={items} locale={preferences.locale} />
      </PlaceholderPage>
    </AppShell>
  );
}
