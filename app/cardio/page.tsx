import Link from "next/link";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

const categoryLabels: Record<string, string> = {
  treadmill_running: "Treadmill running",
  indoor_walking: "Indoor walking",
  incline_walking: "Incline walking",
  stair_climber: "Stair climber",
  elliptical: "Elliptical",
  cycling: "Cycling",
  rowing: "Rowing",
  outdoor_running: "Outdoor running",
  outdoor_walking: "Outdoor walking",
  other: "Other",
};

function formatCardioDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
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

function getPaceLabel({
  distanceUnit,
  distanceValue,
  durationSeconds,
}: {
  distanceUnit: string;
  distanceValue: number | string | null;
  durationSeconds: number;
}) {
  const distanceNumber = Number(distanceValue);

  if (!Number.isFinite(distanceNumber) || distanceNumber <= 0) {
    return "Pace unavailable";
  }

  const paceSeconds = durationSeconds / distanceNumber;
  const minutes = Math.floor(paceSeconds / 60);
  const seconds = Math.round(paceSeconds % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")} / ${distanceUnit}`;
}

export default async function CardioPage() {
  await requireAuth("/cardio");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cardio_entries")
    .select(
      "id, cardio_exercise_id, cardio_date, duration_seconds, distance_value, distance_unit, calories, notes, created_at",
    )
    .order("cardio_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);
  const entries = (data ?? []) as CardioEntryRow[];
  const exerciseIds = Array.from(
    new Set(entries.map((entry) => entry.cardio_exercise_id)),
  );
  const exercisesResult = exerciseIds.length
    ? await supabase
        .from("cardio_exercises")
        .select("id, name, category")
        .in("id", exerciseIds)
        .order("name", { ascending: true })
    : { data: [], error: null };
  const exercises = (exercisesResult.data ?? []) as CardioExerciseRow[];
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Cardio"
        title="Recent cardio"
        description="Track aerobic work separately from strength sets."
        actions={
          <Link
            href="/cardio/new"
            className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-5 text-base font-bold text-white"
          >
            New cardio
          </Link>
        }
      >
        {error || exercisesResult.error ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            role="alert"
          >
            Cardio history could not be loaded. If Stage 5 was just added, apply
            the cardio migration in Supabase first.
          </div>
        ) : null}

        {entries.length ? (
          <ul className="space-y-3">
            {entries.map((entry) => {
              const exercise = exerciseById.get(entry.cardio_exercise_id);

              return (
                <li
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
                  key={entry.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold text-[var(--foreground)]">
                          {exercise?.name ?? "Unknown cardio"}
                        </h2>
                        <span className="rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--accent-strong)]">
                          {categoryLabels[exercise?.category ?? ""] ?? "Cardio"}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--muted)]">
                        {formatCardioDate(entry.cardio_date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--muted)]">
                      {entry.calories === null ? "Calories optional" : `${entry.calories} cal`}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-md bg-[var(--surface-strong)] p-3">
                      <p className="text-xs font-bold uppercase text-[var(--muted)]">
                        Duration
                      </p>
                      <p className="mt-1 text-base font-bold text-[var(--foreground)]">
                        {formatDuration(entry.duration_seconds)}
                      </p>
                    </div>
                    <div className="rounded-md bg-[var(--surface-strong)] p-3">
                      <p className="text-xs font-bold uppercase text-[var(--muted)]">
                        Distance
                      </p>
                      <p className="mt-1 text-base font-bold text-[var(--foreground)]">
                        {formatDistance(entry.distance_value, entry.distance_unit)}
                      </p>
                    </div>
                    <div className="rounded-md bg-[var(--surface-strong)] p-3">
                      <p className="text-xs font-bold uppercase text-[var(--muted)]">
                        Pace
                      </p>
                      <p className="mt-1 text-base font-bold text-[var(--foreground)]">
                        {getPaceLabel({
                          distanceUnit: entry.distance_unit,
                          distanceValue: entry.distance_value,
                          durationSeconds: entry.duration_seconds,
                        })}
                      </p>
                    </div>
                  </div>

                  {entry.notes ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                      {entry.notes}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
            No cardio entries yet.
          </div>
        )}
      </PlaceholderPage>
    </AppShell>
  );
}
