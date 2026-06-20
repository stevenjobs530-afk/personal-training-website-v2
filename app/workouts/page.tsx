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
      setCount: sessionSets.length,
    };
  });
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
        description="Review recent sessions and the sets recorded for each exercise."
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
            {history.map((session) => (
              <li key={session.id}>
                <Link
                  className="block rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--accent)]"
                  href={`/workouts/${session.id}`}
                >
                  <div className="flex min-h-12 items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-[var(--foreground)]">
                        {formatWorkoutDate(session.workout_date)}
                      </p>
                      <p className="text-sm font-semibold text-[var(--muted)]">
                        {session.setCount} {session.setCount === 1 ? "set" : "sets"}
                      </p>
                      {session.notes ? (
                        <p className="text-sm leading-6 text-[var(--muted)]">
                          {session.notes}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-sm font-semibold text-[var(--accent)]">
                      Open
                    </span>
                  </div>

                  {session.exercises.length ? (
                    <div className="mt-4 space-y-3">
                      {session.exercises.map((exercise) => (
                        <section
                          className="rounded-md bg-[var(--surface-strong)] p-3"
                          key={exercise.exerciseId}
                        >
                          <h2 className="text-sm font-bold text-[var(--foreground)]">
                            {exercise.exerciseName}
                          </h2>
                          <ul className="mt-2 space-y-2">
                            {exercise.sets.map((set) => (
                              <li
                                className="text-sm leading-6 text-[var(--muted)]"
                                key={set.id}
                              >
                                <span className="font-bold uppercase text-[var(--foreground)]">
                                  {set.setKind}
                                </span>{" "}
                                Set {set.setNumber}: {set.weight} x {set.reps}
                                {set.notes ? ` - ${set.notes}` : ""}
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-md bg-[var(--surface-strong)] p-3 text-sm font-semibold text-[var(--muted)]">
                      No sets recorded yet.
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
            No workout sessions yet.
          </div>
        )}
      </PlaceholderPage>
    </AppShell>
  );
}
