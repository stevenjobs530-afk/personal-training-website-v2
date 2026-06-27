import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { ProgressView, type ProgressItem } from "./progress-view";

export const dynamic = "force-dynamic";

type ExerciseRow = {
  id: string;
  name: string;
};

type WorkoutSetRow = {
  exercise_id: string;
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

function formatPointLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function buildAveragePoints(valuesByDate: Map<string, AggregateValue>) {
  return Array.from(valuesByDate.entries())
    .toSorted(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map(([date, value]) => ({
      date,
      label: formatPointLabel(date),
      value: Number((value.total / value.count).toFixed(1)),
    }));
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

function buildStrengthProgressItems({
  exercises,
  sessionsById,
  workoutSets,
}: {
  exercises: ExerciseRow[];
  sessionsById: Map<string, WorkoutSessionRow>;
  workoutSets: WorkoutSetRow[];
}): ProgressItem[] {
  const valuesByExercise = new Map<string, Map<string, AggregateValue>>();

  workoutSets.forEach((set) => {
    if (set.set_kind !== "working") {
      return;
    }

    const session = sessionsById.get(set.session_id);
    const weight = Number(set.weight);

    if (!session || !Number.isFinite(weight)) {
      return;
    }

    const valuesByDate = valuesByExercise.get(set.exercise_id) ?? new Map();
    addAggregate(valuesByDate, session.workout_date, weight);
    valuesByExercise.set(set.exercise_id, valuesByDate);
  });

  return exercises.map((exercise) => {
    const points = buildAveragePoints(valuesByExercise.get(exercise.id) ?? new Map());

    return {
      emptyMessage: "No working-set trend yet.",
      id: `strength-${exercise.id}`,
      initial: getInitial(exercise.name),
      kind: "strength",
      metricLabel: "Average working-set weight over time",
      name: exercise.name,
      points,
      unit: "kg",
    };
  });
}

function buildCardioProgressItems({
  cardioEntries,
  cardioExercises,
}: {
  cardioEntries: CardioEntryRow[];
  cardioExercises: CardioExerciseRow[];
}): ProgressItem[] {
  const valuesByExercise = new Map<string, Map<string, AggregateValue>>();

  cardioEntries.forEach((entry) => {
    const calories = Number(entry.calories);

    if (!Number.isFinite(calories) || calories <= 0) {
      return;
    }

    const valuesByDate = valuesByExercise.get(entry.cardio_exercise_id) ?? new Map();
    addAggregate(valuesByDate, entry.cardio_date, calories);
    valuesByExercise.set(entry.cardio_exercise_id, valuesByDate);
  });

  return cardioExercises.map((exercise) => ({
    emptyMessage: "No cardio kcal trend yet.",
    id: `cardio-${exercise.id}`,
    initial: getInitial(exercise.name),
    kind: "cardio",
    metricLabel: "Average kcal consumed over time",
    name: exercise.name,
    points: buildAveragePoints(valuesByExercise.get(exercise.id) ?? new Map()),
    unit: "kcal",
  }));
}

export default async function ProgressPage() {
  await requireAuth("/progress");

  const supabase = await createClient();
  const exercisesResult = await supabase
    .from("exercises")
    .select("id, name")
    .order("name", { ascending: true });
  const workoutSetsResult = await supabase
    .from("workout_sets")
    .select("session_id, exercise_id, set_kind, weight");
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
    exercises: (exercisesResult.data ?? []) as ExerciseRow[],
    sessionsById,
    workoutSets,
  });
  const cardioItems =
    cardioExercisesResult.error || cardioEntriesResult.error
      ? []
      : buildCardioProgressItems({
          cardioEntries: (cardioEntriesResult.data ?? []) as CardioEntryRow[],
          cardioExercises: (cardioExercisesResult.data ?? []) as CardioExerciseRow[],
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
        eyebrow="Progress"
        title="Personal Training Experience Progress"
        description="Search and review trends for each saved exercise over time."
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

        <ProgressView items={items} />
      </PlaceholderPage>
    </AppShell>
  );
}
