import Link from "next/link";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type WorkoutSessionRow = {
  id: string;
  workout_date: string;
  notes: string | null;
  created_at: string;
};

type WorkoutSetRow = {
  id: string;
  session_id: string;
  exercise_id: string;
};

type ExerciseRow = {
  id: string;
  name: string;
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

type ActivityCount = {
  cardio: number;
  strength: number;
};

type CalendarDay = {
  count: number;
  date: Date;
  dateKey: string;
  isOutsideYear: boolean;
};

type CalendarMonthSpan = {
  key: string;
  label: string;
  span: number;
  startColumn: number;
};

type HistoryItem =
  | {
      date: string;
      exerciseCount: number;
      href: string;
      id: string;
      kind: "strength";
      setCount: number;
      sortKey: string;
      title: string;
    }
  | {
      date: string;
      details: string;
      href: string;
      id: string;
      kind: "cardio";
      sortKey: string;
      title: string;
    };

type HistoryDayGroup = {
  date: string;
  items: HistoryItem[];
};

type HistoryMonthGroup = {
  days: HistoryDayGroup[];
  key: string;
  label: string;
  totalCount: number;
};

type HistoryYearGroup = {
  months: HistoryMonthGroup[];
  totalCount: number;
  year: string;
};

const categoryLabels: Record<string, string> = {
  indoor_walking: "Indoor Walking",
  outdoor_walking: "Outdoor Walking",
  indoor_running: "Indoor Running",
  outdoor_running: "Outdoor Running",
  cycling: "Indoor Cycling",
  elliptical: "Elliptical",
};

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function startOfUtcWeek(date: Date) {
  const weekStart = new Date(date);
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
  return weekStart;
}

function endOfUtcWeek(date: Date) {
  const weekEnd = startOfUtcWeek(date);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  return weekEnd;
}

function formatMonthDay(value: string) {
  const date = toUtcDate(value);

  return {
    day: new Intl.DateTimeFormat("en", {
      day: "numeric",
      timeZone: "UTC",
    }).format(date),
    month: new Intl.DateTimeFormat("en", {
      month: "short",
      timeZone: "UTC",
    }).format(date),
  };
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatYear(value: string) {
  return new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    year: "numeric",
  }).format(toUtcDate(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(toUtcDate(value));
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

function getActivityColor(count: number, isInactive: boolean) {
  if (isInactive) {
    return "transparent";
  }

  if (count <= 0) {
    return "var(--surface-strong)";
  }

  if (count === 1) {
    return "var(--accent-soft)";
  }

  if (count === 2) {
    return "#88b5a6";
  }

  return "var(--accent)";
}

function buildCalendarWeeks(activityByDate: Map<string, ActivityCount>) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const targetYear = today.getUTCFullYear();

  const start = startOfUtcWeek(
    new Date(Date.UTC(targetYear, 0, 1)),
  );
  const end = endOfUtcWeek(new Date(Date.UTC(targetYear, 11, 31)));
  const weeks: CalendarDay[][] = [];
  let cursor = new Date(start);

  while (cursor <= end) {
    const week: CalendarDay[] = [];

    for (let index = 0; index < 7; index += 1) {
      const date = new Date(cursor);
      const dateKey = toDateKey(date);
      const activity = activityByDate.get(dateKey);
      const isOutsideYear = date.getUTCFullYear() !== targetYear;
      const count = (activity?.strength ?? 0) + (activity?.cardio ?? 0);

      week.push({
        count,
        date,
        dateKey,
        isOutsideYear,
      });

      cursor = addDays(cursor, 1);
    }

    weeks.push(week);
  }

  return weeks;
}

function getDominantWeekMonthKey(week: CalendarDay[]) {
  const monthCounts = new Map<string, number>();

  week.forEach((day) => {
    if (day.isOutsideYear) {
      return;
    }

    const monthKey = `${day.date.getUTCFullYear()}-${day.date.getUTCMonth()}`;
    monthCounts.set(monthKey, (monthCounts.get(monthKey) ?? 0) + 1);
  });

  return Array.from(monthCounts.entries()).toSorted(
    ([leftKey, leftCount], [rightKey, rightCount]) => {
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }

      return leftKey.localeCompare(rightKey);
    },
  )[0]?.[0];
}

function buildCalendarMonthSpans(calendarWeeks: CalendarDay[][]) {
  const spans: CalendarMonthSpan[] = [];

  calendarWeeks.forEach((week, weekIndex) => {
    const monthKey = getDominantWeekMonthKey(week);

    if (!monthKey) {
      return;
    }

    const lastSpan = spans.at(-1);

    if (lastSpan?.key === monthKey) {
      lastSpan.span += 1;
      return;
    }

    const [year, month] = monthKey.split("-").map(Number);

    spans.push({
      key: monthKey,
      label: formatMonthLabel(new Date(Date.UTC(year, month, 1))),
      span: 1,
      startColumn: weekIndex + 1,
    });
  });

  return spans;
}

function addActivityCount(
  activityByDate: Map<string, ActivityCount>,
  dateKey: string,
  kind: "cardio" | "strength",
) {
  const count = activityByDate.get(dateKey) ?? { cardio: 0, strength: 0 };
  count[kind] += 1;
  activityByDate.set(dateKey, count);
}

function groupHistoryItems(historyItems: HistoryItem[]): HistoryYearGroup[] {
  const years = new Map<string, Map<string, Map<string, HistoryItem[]>>>();

  historyItems.forEach((item) => {
    const date = toUtcDate(item.date);
    const year = formatYear(item.date);
    const monthKey = `${year}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const yearGroup = years.get(year) ?? new Map<string, Map<string, HistoryItem[]>>();
    const monthGroup = yearGroup.get(monthKey) ?? new Map<string, HistoryItem[]>();
    const dayGroup = monthGroup.get(item.date) ?? [];

    dayGroup.push(item);
    monthGroup.set(item.date, dayGroup);
    yearGroup.set(monthKey, monthGroup);
    years.set(year, yearGroup);
  });

  return Array.from(years.entries())
    .toSorted(([leftYear], [rightYear]) => rightYear.localeCompare(leftYear))
    .map(([year, months]) => {
      const monthGroups = Array.from(months.entries())
        .toSorted(([leftMonth], [rightMonth]) => rightMonth.localeCompare(leftMonth))
        .map(([monthKey, days]) => {
          const firstDate = toUtcDate(`${monthKey}-01`);
          const dayGroups = Array.from(days.entries())
            .toSorted(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
            .map(([date, items]) => ({
              date,
              items: items.toSorted((left, right) =>
                right.sortKey.localeCompare(left.sortKey),
              ),
            }));

          return {
            days: dayGroups,
            key: monthKey,
            label: formatMonthLabel(firstDate),
            totalCount: dayGroups.reduce(
              (total, day) => total + day.items.length,
              0,
            ),
          };
        });

      return {
        months: monthGroups,
        totalCount: monthGroups.reduce(
          (total, month) => total + month.totalCount,
          0,
        ),
        year,
      };
    });
}

function getHistoryItemSummary(item: HistoryItem) {
  if (item.kind === "cardio") {
    return item.details;
  }

  return item.setCount
    ? `${item.setCount} ${item.setCount === 1 ? "set" : "sets"} - ${
        item.exerciseCount
      } ${item.exerciseCount === 1 ? "exercise" : "exercises"}`
    : "Draft - no sets yet";
}

function getHistoryItemTypeLabel(item: HistoryItem) {
  return item.kind === "cardio" ? "Cardio" : "Strength";
}

function getDayKindLabel(day: HistoryDayGroup) {
  const hasCardio = day.items.some((item) => item.kind === "cardio");
  const hasStrength = day.items.some((item) => item.kind === "strength");

  if (hasCardio && hasStrength) {
    return "Mixed";
  }

  return hasCardio ? "Cardio" : "Strength";
}

function getDaySummary(day: HistoryDayGroup) {
  const strengthItems = day.items.filter((item) => item.kind === "strength");
  const cardioItems = day.items.filter((item) => item.kind === "cardio");
  const totalSets = strengthItems.reduce(
    (total, item) => total + item.setCount,
    0,
  );
  const totalExercises = strengthItems.reduce(
    (total, item) => total + item.exerciseCount,
    0,
  );
  const entrySummary = `${day.items.length} ${
    day.items.length === 1 ? "entry" : "entries"
  }`;

  if (strengthItems.length && cardioItems.length) {
    return `${entrySummary} - ${strengthItems.length} strength - ${cardioItems.length} cardio`;
  }

  if (strengthItems.length) {
    return totalSets
      ? `${entrySummary} - ${totalSets} ${
          totalSets === 1 ? "set" : "sets"
        } - ${totalExercises} ${
          totalExercises === 1 ? "exercise" : "exercises"
        }`
      : `${entrySummary} - no sets yet`;
  }

  return day.items.length === 1 ? getHistoryItemSummary(day.items[0]) : entrySummary;
}

function getDayTitle(day: HistoryDayGroup) {
  const titles = Array.from(
    new Set(
      day.items
        .map((item) => item.title)
        .filter((title) => title !== "Workout draft"),
    ),
  );
  const visibleTitles = titles.slice(0, 2);

  if (!visibleTitles.length) {
    return "Workout draft";
  }

  return visibleTitles.join(", ");
}

function DayHistoryCard({ day }: { day: HistoryDayGroup }) {
  const dateParts = formatMonthDay(day.date);
  const dayKindLabel = getDayKindLabel(day);
  const daySummary = getDaySummary(day);
  const visibleTitles = getDayTitle(day);
  const hiddenTitleCount = Math.max(
    0,
    new Set(
      day.items
        .map((item) => item.title)
        .filter((title) => title !== "Workout draft"),
    ).size - 2,
  );
  const isSingleEntry = day.items.length === 1;
  const singleEntry = isSingleEntry ? day.items[0] : null;
  const badgeClass =
    dayKindLabel === "Cardio"
      ? "inline-flex rounded-md bg-[var(--accent-soft)] px-2 py-1 text-[0.68rem] font-black uppercase text-[var(--accent-strong)]"
      : "inline-flex rounded-md bg-[var(--surface-strong)] px-2 py-1 text-[0.68rem] font-black uppercase text-[var(--foreground)]";

  if (singleEntry) {
    return (
      <Link
        aria-label={`Open ${getHistoryItemTypeLabel(
          singleEntry,
        ).toLowerCase()} entry from ${formatLongDate(day.date)}`}
        className="flex min-h-24 items-center gap-3 overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition hover:border-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        href={singleEntry.href}
      >
        <DateTile day={dateParts.day} month={dateParts.month} />

        <div className="min-w-0 flex-1 space-y-1">
          <span className={badgeClass}>{dayKindLabel}</span>
          <p className="truncate text-sm font-black text-[var(--foreground)]">
            {singleEntry.title}
          </p>
          <p className="truncate text-xs font-bold text-[var(--muted)]">
            {daySummary}
          </p>
        </div>

        <OpenLabel />
      </Link>
    );
  }

  return (
    <article className="overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <div className="flex min-h-20 items-center gap-3">
        <DateTile day={dateParts.day} month={dateParts.month} />

        <div className="min-w-0 flex-1 space-y-1">
          <span className={badgeClass}>{dayKindLabel}</span>
          <p className="truncate text-sm font-black text-[var(--foreground)]">
            {visibleTitles}
          </p>
          <p className="truncate text-xs font-bold text-[var(--muted)]">
            {daySummary}
          </p>
          {hiddenTitleCount > 0 ? (
            <p className="text-[0.68rem] font-bold uppercase text-[var(--muted)]">
              +{hiddenTitleCount} more activities
            </p>
          ) : null}
        </div>
      </div>

      <ul className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
        {day.items.map((item) => (
          <li key={`${item.kind}-${item.id}`}>
            <Link
              className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-[var(--background)] px-3 py-2 transition hover:bg-[var(--surface-strong)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              href={item.href}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-[var(--foreground)]">
                  {item.title}
                </p>
                <p className="mt-1 truncate text-xs font-bold text-[var(--muted)]">
                  {getHistoryItemTypeLabel(item)} - {getHistoryItemSummary(item)}
                </p>
              </div>
              <span className="shrink-0 text-sm font-black text-[var(--accent)]">
                Open &gt;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DateTile({ day, month }: { day: string; month: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-strong)] text-center">
      <span className="text-[0.68rem] font-black uppercase text-[var(--muted)]">
        {month}
      </span>
      <span className="text-2xl font-black leading-none text-[var(--foreground)]">
        {day}
      </span>
    </div>
  );
}

function OpenLabel() {
  return (
    <span className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--accent)]">
      Open
      <span aria-hidden="true" className="ml-2 text-base leading-none">
        &gt;
      </span>
    </span>
  );
}

export default async function HistoryPage() {
  await requireAuth("/history");

  const supabase = await createClient();
  const workoutsResult = await supabase
    .from("workout_sessions")
    .select("id, workout_date, notes, created_at")
    .order("workout_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);
  const workoutSessions = (workoutsResult.data ?? []) as WorkoutSessionRow[];
  const sessionIds = workoutSessions.map((session) => session.id);
  const setsResult = sessionIds.length
    ? await supabase
        .from("workout_sets")
        .select("id, session_id, exercise_id")
        .in("session_id", sessionIds)
    : { data: [], error: null };
  const workoutSets = (setsResult.data ?? []) as WorkoutSetRow[];
  const exerciseIds = Array.from(new Set(workoutSets.map((set) => set.exercise_id)));
  const exercisesResult = exerciseIds.length
    ? await supabase
        .from("exercises")
        .select("id, name")
        .in("id", exerciseIds)
    : { data: [], error: null };
  const exercises = (exercisesResult.data ?? []) as ExerciseRow[];
  const exerciseNameById = new Map(
    exercises.map((exercise) => [exercise.id, exercise.name]),
  );

  const cardioResult = await supabase
    .from("cardio_entries")
    .select(
      "id, cardio_exercise_id, cardio_date, duration_seconds, distance_value, distance_unit, calories, notes, created_at",
    )
    .order("cardio_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(80);
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

  const setsBySessionId = new Map<string, WorkoutSetRow[]>();
  workoutSets.forEach((set) => {
    const sessionSets = setsBySessionId.get(set.session_id) ?? [];
    sessionSets.push(set);
    setsBySessionId.set(set.session_id, sessionSets);
  });

  const activityByDate = new Map<string, ActivityCount>();
  workoutSessions.forEach((session) => {
    addActivityCount(activityByDate, session.workout_date, "strength");
  });
  cardioEntries.forEach((entry) => {
    addActivityCount(activityByDate, entry.cardio_date, "cardio");
  });

  const strengthItems: HistoryItem[] = workoutSessions.map((session) => {
    const sessionSets = setsBySessionId.get(session.id) ?? [];
    const exerciseNames = Array.from(
      new Set(
        sessionSets.map(
          (set) => exerciseNameById.get(set.exercise_id) ?? "Unknown exercise",
        ),
      ),
    );

    return {
      date: session.workout_date,
      exerciseCount: exerciseNames.length,
      href: `/workouts/${session.id}`,
      id: session.id,
      kind: "strength",
      setCount: sessionSets.length,
      sortKey: `${session.workout_date}T${session.created_at}`,
      title: exerciseNames.length
        ? exerciseNames.slice(0, 2).join(", ")
        : "Workout draft",
    };
  });

  const cardioItems: HistoryItem[] = cardioEntries.map((entry) => {
    const exercise = cardioExerciseById.get(entry.cardio_exercise_id);

    return {
      date: entry.cardio_date,
      details: formatCardioDetails(entry),
      href: "/cardio",
      id: entry.id,
      kind: "cardio",
      sortKey: `${entry.cardio_date}T${entry.created_at}`,
      title:
        exercise?.name ??
        categoryLabels[exercise?.category ?? ""] ??
        "Cardio session",
    };
  });

  const historyItems = [...strengthItems, ...cardioItems].toSorted((left, right) =>
    right.sortKey.localeCompare(left.sortKey),
  );
  const calendarWeeks = buildCalendarWeeks(activityByDate);
  const calendarMonthSpans = buildCalendarMonthSpans(calendarWeeks);
  const historyGroups = groupHistoryItems(historyItems);
  const strengthCount = workoutSessions.length;
  const cardioCount = cardioEntries.length;
  const activeDayCount = activityByDate.size;
  const hasLoadError =
    workoutsResult.error ||
    setsResult.error ||
    exercisesResult.error ||
    cardioResult.error ||
    cardioExercisesResult.error;

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="History"
        title="Training history"
        description="Frequency at a glance, then a compact day-by-day summary. Open an entry to see the full detail."
      >
        {hasLoadError ? (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800"
            role="alert"
          >
            Some history is not available yet. Apply the cardio Supabase setup,
            then refresh this page.
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <span className="rounded-md bg-[var(--surface-strong)] px-3 py-2 text-sm font-black uppercase text-[var(--foreground)]">
            {strengthCount} strength
          </span>
          <span className="rounded-md bg-[var(--accent-soft)] px-3 py-2 text-sm font-black uppercase text-[var(--accent-strong)]">
            {cardioCount} cardio
          </span>
          <span className="rounded-md bg-[var(--surface-strong)] px-3 py-2 text-sm font-black uppercase text-[var(--foreground)]">
            {activeDayCount} active days
          </span>
        </div>

        <section className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="overflow-x-auto pb-2">
            <div className="mx-auto w-max min-w-max">
              <div
                className="ml-12 grid gap-1 text-center text-[0.68rem] font-bold text-[var(--muted)]"
                style={{
                  gridTemplateColumns: `repeat(${calendarWeeks.length}, 1rem)`,
                }}
              >
                {calendarMonthSpans.map((month) => (
                  <span
                    className="h-5 truncate"
                    key={month.key}
                    style={{
                      gridColumn: `${month.startColumn} / span ${month.span}`,
                    }}
                  >
                    {month.label}
                  </span>
                ))}
              </div>

              <div className="mt-1 flex gap-3">
                <div className="grid grid-rows-7 gap-1 pt-px text-right text-xs font-bold text-[var(--muted)]">
                  {["", "Mon", "", "Wed", "", "Fri", ""].map((label, index) => (
                    <span className="h-4" key={`${label}-${index}`}>
                      {label}
                    </span>
                  ))}
                </div>

                <div className="grid grid-flow-col grid-rows-7 gap-1">
                  {calendarWeeks.flat().map((day) => (
                    <span
                      aria-label={
                        day.isOutsideYear
                          ? "Outside current year"
                          : `${day.dateKey}: ${day.count} sessions`
                      }
                      className="h-4 w-4 rounded-[4px] border border-[var(--border)]"
                      key={day.dateKey}
                      style={{
                        backgroundColor: getActivityColor(
                          day.count,
                          day.isOutsideYear,
                        ),
                        borderColor:
                          day.isOutsideYear
                            ? "transparent"
                            : "var(--border)",
                      }}
                      title={
                        day.isOutsideYear
                          ? "Outside current year"
                          : `${day.dateKey}: ${day.count} sessions`
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs font-black uppercase text-[var(--muted)]">
                <span>Less</span>
                {[0, 1, 2, 3].map((count) => (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 rounded-[4px] border border-[var(--border)]"
                    key={count}
                    style={{ backgroundColor: getActivityColor(count, false) }}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        </section>

        {historyGroups.length ? (
          <section className="space-y-3">
            {historyGroups.map((yearGroup) => (
              <details
                className="rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-sm"
                key={yearGroup.year}
              >
                <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 text-base font-black text-[var(--foreground)]">
                  <span>{yearGroup.year}</span>
                  <span className="text-xs font-bold uppercase text-[var(--muted)]">
                    {yearGroup.totalCount} sessions
                  </span>
                </summary>

                <div className="space-y-3 border-t border-[var(--border)] p-3">
                  {yearGroup.months.map((month) => (
                    <details
                      className="rounded-md border border-[var(--border)] bg-[var(--background)]"
                      key={month.key}
                    >
                      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-3 text-sm font-black text-[var(--foreground)]">
                        <span>{month.label}</span>
                        <span className="text-[0.68rem] font-bold uppercase text-[var(--muted)]">
                          {month.totalCount} records
                        </span>
                      </summary>

                      <div className="space-y-4 border-t border-[var(--border)] p-3">
                        {month.days.map((day) => (
                          <section className="space-y-2" key={day.date}>
                            <div className="flex items-center justify-between gap-3">
                              <h2 className="text-xs font-black uppercase text-[var(--muted)]">
                                {formatLongDate(day.date)}
                              </h2>
                              <span className="text-[0.68rem] font-bold uppercase text-[var(--muted)]">
                                {day.items.length} entries
                              </span>
                            </div>

                            <DayHistoryCard day={day} />
                          </section>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </section>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
            No training history yet. Start a strength workout or record cardio.
          </div>
        )}
      </PlaceholderPage>
    </AppShell>
  );
}
