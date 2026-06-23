import Link from "next/link";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type WorkoutSession = {
  id: string;
  workout_date: string;
  notes: string | null;
  created_at: string;
};

type WorkoutSetRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  set_kind: "warmup" | "working";
  weight: number | string;
  reps: number;
  notes: string | null;
};

type ExerciseRow = {
  id: string;
  name: string;
};

type HistorySet = {
  id: string;
  setNumber: number;
  setKind: "warmup" | "working";
  weight: string;
  reps: number;
  notes: string | null;
};

type ExerciseHistory = {
  exerciseId: string;
  exerciseName: string;
  sets: HistorySet[];
};

type SessionHistory = WorkoutSession & {
  exercises: ExerciseHistory[];
  exerciseCount: number;
  exerciseNames: string[];
  previewSets: (HistorySet & { exerciseName: string })[];
  setCount: number;
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

function buildSessionHistory({
  exerciseNameById,
  sessions,
  sets,
}: {
  exerciseNameById: Map<string, string>;
  sessions: WorkoutSession[];
  sets: WorkoutSetRow[];
}): SessionHistory[] {
  const setsBySessionId = new Map<string, WorkoutSetRow[]>();

  sets.forEach((set) => {
    const sessionSets = setsBySessionId.get(set.session_id) ?? [];
    sessionSets.push(set);
    setsBySessionId.set(set.session_id, sessionSets);
  });

  return sessions.map((session) => {
    const sessionSets = setsBySessionId.get(session.id) ?? [];
    const exerciseGroups = new Map<string, ExerciseHistory>();

    sessionSets
      .toSorted((left, right) => {
        const leftName = exerciseNameById.get(left.exercise_id) ?? "";
        const rightName = exerciseNameById.get(right.exercise_id) ?? "";
        const nameCompare = leftName.localeCompare(rightName);

        if (nameCompare !== 0) {
          return nameCompare;
        }

        return left.set_number - right.set_number;
      })
      .forEach((set) => {
        const exerciseGroup = exerciseGroups.get(set.exercise_id) ?? {
          exerciseId: set.exercise_id,
          exerciseName: exerciseNameById.get(set.exercise_id) ?? "Unknown exercise",
          sets: [],
        };

        exerciseGroup.sets.push({
          id: set.id,
          setNumber: set.set_number,
          setKind: set.set_kind,
          weight: normalizeWeight(set.weight),
          reps: set.reps,
          notes: set.notes,
        });

        exerciseGroups.set(set.exercise_id, exerciseGroup);
      });

    return {
      ...session,
      exercises: Array.from(exerciseGroups.values()),
      exerciseCount: exerciseGroups.size,
      exerciseNames: Array.from(exerciseGroups.values()).map(
        (exercise) => exercise.exerciseName,
      ),
      previewSets: sessionSets
        .toSorted((left, right) => {
          const leftName = exerciseNameById.get(left.exercise_id) ?? "";
          const rightName = exerciseNameById.get(right.exercise_id) ?? "";
          const nameCompare = leftName.localeCompare(rightName);

          if (nameCompare !== 0) {
            return nameCompare;
          }

          return left.set_number - right.set_number;
        })
        .slice(0, 3)
        .map((set) => ({
          id: set.id,
          exerciseName: exerciseNameById.get(set.exercise_id) ?? "Unknown exercise",
          setNumber: set.set_number,
          setKind: set.set_kind,
          weight: normalizeWeight(set.weight),
          reps: set.reps,
          notes: set.notes,
        })),
      setCount: sessionSets.length,
    };
  });
}

function getShortPreview(value: string | null, maxLength = 96) {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

export default async function WorkoutsPage() {
  await requireAuth("/workouts");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, workout_date, notes, created_at")
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  const sessions: WorkoutSession[] = data ?? [];
  const sessionIds = sessions.map((session) => session.id);
  const setsResult = sessionIds.length
    ? await supabase
        .from("workout_sets")
        .select("id, session_id, exercise_id, set_number, set_kind, weight, reps, notes")
        .in("session_id", sessionIds)
        .order("session_id", { ascending: true })
        .order("exercise_id", { ascending: true })
        .order("set_number", { ascending: true })
    : { data: [], error: null };
  const sets = (setsResult.data ?? []) as WorkoutSetRow[];
  const exerciseIds = Array.from(new Set(sets.map((set) => set.exercise_id)));
  const exercisesResult = exerciseIds.length
    ? await supabase
        .from("exercises")
        .select("id, name")
        .in("id", exerciseIds)
        .order("name", { ascending: true })
    : { data: [], error: null };
  const exercises = (exercisesResult.data ?? []) as ExerciseRow[];
  const exerciseNameById = new Map(
    exercises.map((exercise) => [exercise.id, exercise.name]),
  );
  const history = buildSessionHistory({
    exerciseNameById,
    sessions,
    sets,
  });

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Workouts"
        title="Recent workouts"
        description="Review recent sessions at a glance. Open a session for full set details."
        actions={
          <Link
            href="/workouts/new"
            className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-5 text-base font-bold text-white"
          >
            Start workout
          </Link>
        }
      >
        {error || setsResult.error || exercisesResult.error ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            role="alert"
          >
            Workout history could not be fully loaded. Try refreshing the page.
          </div>
        ) : null}

        {history.length ? (
          <ul className="space-y-3">
            {history.map((session) => {
              const notePreview = getShortPreview(session.notes);
              const visibleExerciseNames = session.exerciseNames.slice(0, 3);
              const hiddenExerciseCount =
                session.exerciseNames.length - visibleExerciseNames.length;

              return (
                <li
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
                  key={session.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-2">
                      <p className="text-lg font-black text-[var(--foreground)]">
                        {formatWorkoutDate(session.workout_date)}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs font-bold uppercase">
                        <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-[var(--foreground)]">
                          {session.setCount} {session.setCount === 1 ? "set" : "sets"}
                        </span>
                        <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[var(--accent-strong)]">
                          {session.exerciseCount}{" "}
                          {session.exerciseCount === 1 ? "exercise" : "exercises"}
                        </span>
                      </div>
                    </div>
                    <Link
                      className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--accent)]"
                      href={`/workouts/${session.id}`}
                    >
                      Open
                    </Link>
                  </div>

                  {visibleExerciseNames.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {visibleExerciseNames.map((name) => (
                        <span
                          className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm font-semibold text-[var(--foreground)]"
                          key={name}
                        >
                          {name}
                        </span>
                      ))}
                      {hiddenExerciseCount > 0 ? (
                        <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-sm font-semibold text-[var(--muted)]">
                          +{hiddenExerciseCount} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {notePreview ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {notePreview}
                    </p>
                  ) : null}

                  {session.previewSets.length ? (
                    <details className="mt-3 rounded-md bg-[var(--surface-strong)]">
                      <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-bold text-[var(--accent)]">
                        Preview sets
                      </summary>
                      <ul className="space-y-2 border-t border-[var(--border)] p-3">
                        {session.previewSets.map((set) => (
                          <li
                            className="text-sm leading-6 text-[var(--muted)]"
                            key={set.id}
                          >
                            <span className="font-bold text-[var(--foreground)]">
                              {set.exerciseName}
                            </span>{" "}
                            {set.setKind} {set.setNumber}: {set.weight} x {set.reps}
                            {set.notes ? ` - ${getShortPreview(set.notes, 52)}` : ""}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : (
                    <p className="mt-3 rounded-md bg-[var(--surface-strong)] p-3 text-sm font-semibold text-[var(--muted)]">
                      No sets recorded yet.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
            No workout sessions yet. Start your first workout.
          </div>
        )}
      </PlaceholderPage>
    </AppShell>
  );
}
