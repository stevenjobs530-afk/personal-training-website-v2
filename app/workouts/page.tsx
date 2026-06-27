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

type SessionHistory = WorkoutSession & {
  exerciseCount: number;
  exerciseNames: string[];
  setCount: number;
};

type WorkoutDayHistory = {
  date: string;
  exerciseCount: number;
  exerciseNames: string[];
  sessions: SessionHistory[];
  setCount: number;
};

function formatWorkoutDateParts(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return {
    day: new Intl.DateTimeFormat("en", {
      day: "numeric",
      timeZone: "UTC",
    }).format(date),
    label: new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(date),
    month: new Intl.DateTimeFormat("en", {
      month: "short",
      timeZone: "UTC",
    }).format(date),
  };
}

function formatSetExerciseSummary({
  exerciseCount,
  setCount,
}: {
  exerciseCount: number;
  setCount: number;
}) {
  return setCount
    ? `${setCount} ${setCount === 1 ? "set" : "sets"} - ${exerciseCount} ${
        exerciseCount === 1 ? "exercise" : "exercises"
      }`
    : "No sets yet";
}

function formatDaySummary(day: WorkoutDayHistory) {
  const sessionCount = day.sessions.length;
  const sessionSummary = `${sessionCount} ${
    sessionCount === 1 ? "session" : "sessions"
  }`;

  if (!day.setCount) {
    return `${sessionSummary} - no sets yet`;
  }

  return `${sessionSummary} - ${formatSetExerciseSummary(day)}`;
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
    const exerciseNames = Array.from(
      new Set(
        sessionSets.map(
          (set) => exerciseNameById.get(set.exercise_id) ?? "Unknown exercise",
        ),
      ),
    ).toSorted((left, right) => left.localeCompare(right));

    return {
      ...session,
      exerciseCount: exerciseNames.length,
      exerciseNames,
      setCount: sessionSets.length,
    };
  });
}

function buildWorkoutDayHistory(sessions: SessionHistory[]) {
  const days = new Map<string, WorkoutDayHistory>();

  sessions.forEach((session) => {
    const day = days.get(session.workout_date) ?? {
      date: session.workout_date,
      exerciseCount: 0,
      exerciseNames: [],
      sessions: [],
      setCount: 0,
    };

    day.sessions.push(session);
    day.setCount += session.setCount;

    session.exerciseNames.forEach((name) => {
      if (!day.exerciseNames.includes(name)) {
        day.exerciseNames.push(name);
      }
    });

    day.exerciseCount = day.exerciseNames.length;
    days.set(session.workout_date, day);
  });

  return Array.from(days.values());
}

function getWorkoutTitle(exerciseNames: string[]) {
  const visibleExerciseNames = exerciseNames.slice(0, 2);

  return visibleExerciseNames.length
    ? visibleExerciseNames.join(", ")
    : "Workout draft";
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
  const workoutDays = buildWorkoutDayHistory(history);

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Workouts"
        title="Recent workouts"
        description="Review recent sessions at a glance."
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

        {workoutDays.length ? (
          <ul className="space-y-2">
            {workoutDays.map((day) => {
              const dateParts = formatWorkoutDateParts(day.date);
              const session = day.sessions[0];
              const isSingleSession = day.sessions.length === 1;
              const dayTitle = getWorkoutTitle(day.exerciseNames);
              const hiddenExerciseCount =
                day.exerciseNames.length - day.exerciseNames.slice(0, 2).length;
              const daySummary = isSingleSession
                ? formatSetExerciseSummary(day)
                : formatDaySummary(day);
              const dateTile = (
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-strong)] text-center">
                  <span className="text-[0.68rem] font-black uppercase text-[var(--muted)]">
                    {dateParts.month}
                  </span>
                  <span className="text-2xl font-black leading-none text-[var(--foreground)]">
                    {dateParts.day}
                  </span>
                </div>
              );
              const dayText = (
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-black text-[var(--foreground)]">
                    {dayTitle}
                  </h2>
                  <p className="mt-1 truncate text-sm font-semibold text-[var(--muted)]">
                    {daySummary}
                  </p>

                  {hiddenExerciseCount > 0 ? (
                    <p className="mt-1 text-xs font-bold uppercase text-[var(--muted)]">
                      +{hiddenExerciseCount} more exercises
                    </p>
                  ) : null}
                </div>
              );

              return isSingleSession && session ? (
                <li key={day.date}>
                  <Link
                    aria-label={`Open workout from ${dateParts.label}`}
                    className="flex min-h-20 items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    href={`/workouts/${session.id}`}
                  >
                    {dateTile}
                    {dayText}
                    <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--accent)]">
                      Open
                      <span aria-hidden="true" className="ml-2 text-base leading-none">
                        &gt;
                      </span>
                    </span>
                  </Link>
                </li>
              ) : (
                <li key={day.date}>
                  <details className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                    <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-3 transition hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] [&::-webkit-details-marker]:hidden">
                      {dateTile}
                      {dayText}
                      <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--accent)]">
                        Sessions
                        <span aria-hidden="true" className="ml-2 text-base leading-none">
                          &gt;
                        </span>
                      </span>
                    </summary>

                    <ul className="space-y-2 border-t border-[var(--border)] bg-[var(--background)] p-3">
                      {day.sessions.map((daySession) => {
                        const sessionTitle = getWorkoutTitle(
                          daySession.exerciseNames,
                        );
                        const sessionSummary =
                          formatSetExerciseSummary(daySession);

                        return (
                          <li key={daySession.id}>
                            <Link
                              className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                              href={`/workouts/${daySession.id}`}
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-[var(--foreground)]">
                                  {sessionTitle}
                                </p>
                                <p className="mt-1 truncate text-xs font-bold text-[var(--muted)]">
                                  {sessionSummary}
                                </p>
                              </div>
                              <span className="shrink-0 text-sm font-black text-[var(--accent)]">
                                Open &gt;
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
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
