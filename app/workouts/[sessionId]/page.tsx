import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "../../_components/app-shell";
import { PlaceholderPage } from "../../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { filterStrengthExercises } from "@/lib/training/cardio-reserved";
import {
  type PreviousBestSet,
  type SessionExercise,
  type SessionSet,
  WorkoutSetManager,
} from "./workout-set-manager";

export const dynamic = "force-dynamic";

type WorkoutSessionPageProps = {
  params: Promise<{
    sessionId: string;
  }>;
};

type WorkoutSession = {
  id: string;
  workout_date: string;
  notes: string | null;
};

type WorkoutSetRow = {
  id: string;
  exercise_id: string;
  set_number: number;
  set_kind: "warmup" | "working";
  weight: number | string;
  reps: number;
  notes: string | null;
  created_at: string;
};

type PreviousWorkoutSetRow = {
  exercise_id: string;
  reps: number;
  session_id: string;
  weight: number | string;
};

type PreviousWorkoutSessionRow = {
  id: string;
  workout_date: string;
};

function formatWorkoutDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function normalizeWeight(value: number | string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  return Number.isInteger(numberValue) ? String(numberValue) : String(numberValue);
}

function buildPreviousBestByExerciseId({
  previousSessions,
  previousSets,
}: {
  previousSessions: PreviousWorkoutSessionRow[];
  previousSets: PreviousWorkoutSetRow[];
}) {
  const sessionDateById = new Map(
    previousSessions.map((session) => [session.id, session.workout_date]),
  );
  const bestByExerciseId: Record<string, PreviousBestSet> = {};
  const bestSortByExerciseId = new Map<
    string,
    { reps: number; weight: number; workoutDate: string }
  >();

  previousSets.forEach((set) => {
    const weight = Number(set.weight);
    const workoutDate = sessionDateById.get(set.session_id) ?? "";

    if (!Number.isFinite(weight)) {
      return;
    }

    const currentBest = bestSortByExerciseId.get(set.exercise_id);
    const isBetter =
      !currentBest ||
      weight > currentBest.weight ||
      (weight === currentBest.weight && set.reps > currentBest.reps) ||
      (weight === currentBest.weight &&
        set.reps === currentBest.reps &&
        workoutDate > currentBest.workoutDate);

    if (!isBetter) {
      return;
    }

    bestSortByExerciseId.set(set.exercise_id, {
      reps: set.reps,
      weight,
      workoutDate,
    });
    bestByExerciseId[set.exercise_id] = {
      reps: set.reps,
      weight: normalizeWeight(set.weight),
    };
  });

  return bestByExerciseId;
}

export default async function WorkoutSessionPage({
  params,
}: WorkoutSessionPageProps) {
  const { sessionId } = await params;
  await requireAuth(`/workouts/${sessionId}`);

  const supabase = await createClient();
  const [sessionResult, exercisesResult, setsResult] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id, workout_date, notes")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase.from("exercises").select("id, name").order("name", { ascending: true }),
    supabase
      .from("workout_sets")
      .select("id, exercise_id, set_number, set_kind, weight, reps, notes, created_at")
      .eq("session_id", sessionId)
      .order("exercise_id", { ascending: true })
      .order("set_number", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (sessionResult.error || !sessionResult.data) {
    notFound();
  }

  const session = sessionResult.data as WorkoutSession;
  const previousSessionsResult = await supabase
    .from("workout_sessions")
    .select("id, workout_date")
    .lt("workout_date", session.workout_date);
  const previousSessions =
    (previousSessionsResult.data ?? []) as PreviousWorkoutSessionRow[];
  const previousSessionIds = previousSessions.map((previousSession) => previousSession.id);
  const previousSetsResult = previousSessionIds.length
    ? await supabase
        .from("workout_sets")
        .select("exercise_id, session_id, weight, reps")
        .eq("set_kind", "working")
        .in("session_id", previousSessionIds)
    : { data: [], error: null };
  const exercises = (exercisesResult.data ?? []) as SessionExercise[];
  const selectableExercises = filterStrengthExercises(exercises);
  const exerciseNameById = new Map(
    exercises.map((exercise) => [exercise.id, exercise.name]),
  );
  const sets = ((setsResult.data ?? []) as WorkoutSetRow[]).map<SessionSet>((set) => ({
    createdAt: set.created_at,
    id: set.id,
    exerciseId: set.exercise_id,
    exerciseName: exerciseNameById.get(set.exercise_id) ?? "Unknown exercise",
    setNumber: set.set_number,
    setKind: set.set_kind,
    weight: normalizeWeight(set.weight),
    reps: set.reps,
    notes: set.notes,
  }));
  const previousBestByExerciseId = buildPreviousBestByExerciseId({
    previousSessions,
    previousSets: (previousSetsResult.data ?? []) as PreviousWorkoutSetRow[],
  });

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Workout"
        title={formatWorkoutDate(session.workout_date)}
        description={session.notes ?? "Record warmup and working sets for this session."}
        actions={
          <Link
            className="inline-flex min-h-12 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 text-base font-bold text-[var(--foreground)]"
            href="/workouts"
          >
            All workouts
          </Link>
        }
      >
        {exercisesResult.error ||
        setsResult.error ||
        previousSessionsResult.error ||
        previousSetsResult.error ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            role="alert"
          >
            Workout data could not be fully loaded. Try refreshing the page.
          </div>
        ) : null}
        <WorkoutSetManager
          exercises={selectableExercises}
          previousBestByExerciseId={previousBestByExerciseId}
          sessionId={session.id}
          sets={sets}
        />
      </PlaceholderPage>
    </AppShell>
  );
}
