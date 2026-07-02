import Link from "next/link";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { removeRestDay } from "@/app/_actions/rest-days";
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

type RestDayRow = {
  id: string;
  rest_date: string;
  notes: string | null;
};

type CardioEntryRow = {
  id: string;
  cardio_exercise_id: string;
  cardio_date: string;
  duration_seconds: number;
  distance_value: number | string | null;
  distance_unit: "km" | "mi";
  calories: number | null;
  notes: string | null;
  created_at: string;
};

type CardioExerciseRow = {
  id: string;
  name: string;
  category: string;
};

type SessionHistory = WorkoutSession & {
  exerciseCount: number;
  exerciseNames: string[];
  setCount: number;
};

type CardioEntryHistory = CardioEntryRow & {
  details: string;
  title: string;
};

type WorkoutDayHistory = {
  cardioEntries: CardioEntryHistory[];
  date: string;
  exerciseCount: number;
  exerciseNames: string[];
  restDay: RestDayRow | null;
  sessions: SessionHistory[];
  setCount: number;
};

const categoryLabels: Record<string, string> = {
  indoor_walking: "Indoor Walking",
  outdoor_walking: "Outdoor Walking",
  indoor_running: "Indoor Running",
  outdoor_running: "Outdoor Running",
  cycling: "Indoor Cycling",
  elliptical: "Elliptical",
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

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function formatNumber(value: number | string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return String(value);
  }

  return Number.isInteger(numberValue) ? String(numberValue) : String(numberValue);
}

function formatDistance(value: number | string | null, unit: string) {
  if (value === null) {
    return "No distance";
  }

  return `${formatNumber(value)} ${unit}`;
}

function formatCardioDetails(entry: CardioEntryRow) {
  return [
    formatDuration(entry.duration_seconds),
    entry.distance_value === null
      ? null
      : formatDistance(entry.distance_value, entry.distance_unit),
    entry.calories === null ? "No kcal" : `${entry.calories} kcal`,
  ]
    .filter(Boolean)
    .join(" - ");
}

function formatStrengthDaySummary(day: WorkoutDayHistory) {
  const sessionCount = day.sessions.length;
  const sessionSummary = `${sessionCount} ${
    sessionCount === 1 ? "session" : "sessions"
  }`;

  if (!day.setCount) {
    return `${sessionSummary} - no sets yet`;
  }

  return `${sessionSummary} - ${formatSetExerciseSummary(day)}`;
}

function formatCardioDaySummary(cardioEntries: CardioEntryHistory[]) {
  if (cardioEntries.length === 1) {
    return `Cardio - ${cardioEntries[0].details}`;
  }

  const calories = cardioEntries.reduce(
    (total, entry) => total + (entry.calories ?? 0),
    0,
  );

  return `${cardioEntries.length} cardio entries${
    calories ? ` - ${calories} kcal` : ""
  }`;
}

function formatDaySummary(day: WorkoutDayHistory) {
  const parts: string[] = [];

  if (day.sessions.length) {
    parts.push(formatStrengthDaySummary(day));
  }

  if (day.cardioEntries.length) {
    parts.push(formatCardioDaySummary(day.cardioEntries));
  }

  if (day.restDay) {
    parts.push("rest day logged");
  }

  return parts.join(" - ");
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

function buildCardioEntryHistory({
  cardioExerciseById,
  entries,
}: {
  cardioExerciseById: Map<string, CardioExerciseRow>;
  entries: CardioEntryRow[];
}): CardioEntryHistory[] {
  return entries.map((entry) => {
    const exercise = cardioExerciseById.get(entry.cardio_exercise_id);

    return {
      ...entry,
      details: formatCardioDetails(entry),
      title:
        exercise?.name ??
        categoryLabels[exercise?.category ?? ""] ??
        "Cardio session",
    };
  });
}

function buildWorkoutDayHistory(
  cardioEntries: CardioEntryHistory[],
  sessions: SessionHistory[],
  restDays: RestDayRow[],
) {
  const days = new Map<string, WorkoutDayHistory>();

  const getDay = (date: string) => {
    const day = days.get(date) ?? {
      cardioEntries: [],
      date,
      exerciseCount: 0,
      exerciseNames: [],
      restDay: null,
      sessions: [],
      setCount: 0,
    };

    days.set(date, day);

    return day;
  };

  sessions.forEach((session) => {
    const day = getDay(session.workout_date);

    day.sessions.push(session);
    day.setCount += session.setCount;

    session.exerciseNames.forEach((name) => {
      if (!day.exerciseNames.includes(name)) {
        day.exerciseNames.push(name);
      }
    });

    day.exerciseCount = day.exerciseNames.length;
  });

  cardioEntries.forEach((entry) => {
    getDay(entry.cardio_date).cardioEntries.push(entry);
  });

  restDays.forEach((restDay) => {
    getDay(restDay.rest_date).restDay = restDay;
  });

  return Array.from(days.values())
    .map((day) => ({
      ...day,
      cardioEntries: day.cardioEntries.toSorted((left, right) =>
        right.created_at.localeCompare(left.created_at),
      ),
      sessions: day.sessions.toSorted((left, right) =>
        right.created_at.localeCompare(left.created_at),
      ),
    }))
    .toSorted((left, right) => right.date.localeCompare(left.date));
}

function getWorkoutTitle(exerciseNames: string[]) {
  const visibleExerciseNames = exerciseNames.slice(0, 2);

  return visibleExerciseNames.length
    ? visibleExerciseNames.join(", ")
    : "Workout draft";
}

function getDayTitle(day: WorkoutDayHistory) {
  const titles = Array.from(
    new Set([
      ...day.exerciseNames,
      ...day.cardioEntries.map((entry) => entry.title),
    ]),
  ).filter(Boolean);
  const visibleTitles = titles.slice(0, 2);

  return visibleTitles.length ? visibleTitles.join(", ") : "Workout draft";
}

function getHiddenActivityTitleCount(day: WorkoutDayHistory) {
  const titleCount = new Set([
    ...day.exerciseNames,
    ...day.cardioEntries.map((entry) => entry.title),
  ]).size;

  return Math.max(0, titleCount - 2);
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
  const restDaysResult = await supabase
    .from("rest_days")
    .select("id, rest_date, notes")
    .order("rest_date", { ascending: false })
    .limit(10);
  const restDays = (restDaysResult.data ?? []) as RestDayRow[];
  const cardioResult = await supabase
    .from("cardio_entries")
    .select(
      "id, cardio_exercise_id, cardio_date, duration_seconds, distance_value, distance_unit, calories, notes, created_at",
    )
    .order("cardio_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);
  const cardioEntries = (cardioResult.data ?? []) as CardioEntryRow[];
  const cardioExerciseIds = Array.from(
    new Set(cardioEntries.map((entry) => entry.cardio_exercise_id)),
  );
  const cardioExercisesResult = cardioExerciseIds.length
    ? await supabase
        .from("cardio_exercises")
        .select("id, name, category")
        .in("id", cardioExerciseIds)
    : { data: [], error: null };
  const cardioExercises = (cardioExercisesResult.data ?? []) as CardioExerciseRow[];
  const cardioExerciseById = new Map(
    cardioExercises.map((exercise) => [exercise.id, exercise]),
  );
  const history = buildSessionHistory({
    exerciseNameById,
    sessions,
    sets,
  });
  const cardioHistory = buildCardioEntryHistory({
    cardioExerciseById,
    entries: cardioEntries,
  });
  const workoutDays = buildWorkoutDayHistory(cardioHistory, history, restDays);

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Workouts"
        title="Recent activity and rest days"
        description="Review strength, cardio, Rest Days, and quick corrections at a glance."
        actions={
          <Link
            href="/workouts/new"
            className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-5 text-base font-bold text-white"
          >
            Start workout
          </Link>
        }
      >
        {error ||
        setsResult.error ||
        exercisesResult.error ||
        restDaysResult.error ||
        cardioResult.error ||
        cardioExercisesResult.error ? (
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
              const cardioEntry = day.cardioEntries[0];
              const isRestOnly =
                day.sessions.length === 0 &&
                day.cardioEntries.length === 0 &&
                day.restDay;
              const isSingleSession =
                day.sessions.length === 1 &&
                day.cardioEntries.length === 0 &&
                !day.restDay;
              const isSingleCardio =
                day.sessions.length === 0 &&
                day.cardioEntries.length === 1 &&
                !day.restDay;
              const dayTitle = getDayTitle(day);
              const hiddenActivityCount = getHiddenActivityTitleCount(day);
              const daySummary = formatDaySummary(day);
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

                  {hiddenActivityCount > 0 ? (
                    <p className="mt-1 text-xs font-bold uppercase text-[var(--muted)]">
                      +{hiddenActivityCount} more activities
                    </p>
                  ) : null}
                </div>
              );

              if (isRestOnly && day.restDay) {
                return (
                  <li key={day.date}>
                    <div className="flex min-h-20 items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
                      {dateTile}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-black text-[var(--foreground)]">
                          Rest day
                        </h2>
                        <p className="mt-1 truncate text-sm font-semibold text-[var(--muted)]">
                          {day.restDay.notes ?? "Recovery day - no training logged"}
                        </p>
                      </div>
                      <form action={removeRestDay}>
                        <input
                          name="rest_day_id"
                          type="hidden"
                          value={day.restDay.id}
                        />
                        <button
                          aria-label={`Remove rest day on ${dateParts.label}`}
                          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--muted)]"
                          type="submit"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </li>
                );
              }

              if (isSingleCardio && cardioEntry) {
                return (
                  <li key={day.date}>
                    <Link
                      aria-label={`Open cardio entry from ${dateParts.label}`}
                      className="flex min-h-20 items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                      href="/cardio"
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
                );
              }

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
                        Entries
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
                      {day.cardioEntries.map((dayCardioEntry) => (
                        <li key={`cardio-${dayCardioEntry.id}`}>
                          <Link
                            className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                            href="/cardio"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-[var(--foreground)]">
                                {dayCardioEntry.title}
                              </p>
                              <p className="mt-1 truncate text-xs font-bold text-[var(--muted)]">
                                Cardio - {dayCardioEntry.details}
                              </p>
                            </div>
                            <span className="shrink-0 text-sm font-black text-[var(--accent)]">
                              Open &gt;
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
            No activity yet. Start strength, record cardio, or log a Rest Day.
          </div>
        )}
      </PlaceholderPage>
    </AppShell>
  );
}
