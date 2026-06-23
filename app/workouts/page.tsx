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

function WorkoutFolderIcon({ hasSets }: { hasSets: boolean }) {
  const tabColor = hasSets ? "bg-[#72b8e8]" : "bg-[var(--surface-strong)]";
  const bodyColor = hasSets
    ? "border-[#67addd] bg-[#8bc8f0]"
    : "border-[var(--border)] bg-[var(--surface-strong)]";
  const detailColor = hasSets ? "bg-white/45" : "bg-[var(--border)]";

  return (
    <div className="relative h-16 w-20 transition-transform group-hover:-translate-y-0.5">
      <div className={`absolute left-2 top-1 h-4 w-9 rounded-t-md ${tabColor}`} />
      <div
        className={`absolute inset-x-0 bottom-1 h-12 rounded-md border shadow-sm ${bodyColor}`}
      />
      <div className={`absolute bottom-4 right-3 h-1.5 w-5 rounded-full ${detailColor}`} />
      <div className={`absolute bottom-7 right-3 h-1.5 w-3 rounded-full ${detailColor}`} />
    </div>
  );
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
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {history.map((session) => {
              const notePreview = getShortPreview(session.notes);
              const primaryExercise =
                session.exerciseNames[0] ?? "No sets recorded";
              const extraExerciseCount = Math.max(session.exerciseCount - 1, 0);
              const formattedDate = formatWorkoutDate(session.workout_date);

              return (
                <li key={session.id}>
                  <Link
                    aria-label={`Open workout from ${formattedDate}`}
                    className="group flex h-full min-h-52 flex-col rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-center shadow-sm transition hover:border-[var(--accent)] hover:bg-white"
                    href={`/workouts/${session.id}`}
                  >
                    <div className="flex h-28 w-full items-center justify-center rounded-md bg-[var(--surface-strong)] sm:h-32">
                      <WorkoutFolderIcon hasSets={session.setCount > 0} />
                    </div>

                    <div className="mt-3 min-w-0 space-y-1">
                      <h2 className="truncate text-sm font-black text-[var(--foreground)]">
                        {primaryExercise}
                      </h2>
                      <p className="text-xs font-semibold text-[var(--muted)]">
                        {formattedDate}
                      </p>
                      {extraExerciseCount > 0 ? (
                        <p className="truncate text-xs font-semibold text-[var(--accent)]">
                          +{extraExerciseCount} more
                        </p>
                      ) : notePreview ? (
                        <p className="truncate text-xs font-semibold text-[var(--muted)]">
                          {notePreview}
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-auto flex justify-center gap-1 pt-3 text-[10px] font-black uppercase tracking-[0.08em]">
                      <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-[var(--foreground)]">
                        {session.setCount} {session.setCount === 1 ? "set" : "sets"}
                      </span>
                      <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[var(--accent-strong)]">
                        {session.exerciseCount}{" "}
                        {session.exerciseCount === 1 ? "exercise" : "exercises"}
                      </span>
                    </div>
                  </Link>
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
