"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  logTodayRestDay,
  removeRestDay,
  type RestDayActionState,
} from "@/app/_actions/rest-days";

type TodayRestDayCardProps = {
  backfilledDates: string[];
  hasCardio: boolean;
  hasStrength: boolean;
  restDay: {
    id: string;
    notes: string | null;
  } | null;
  setupError?: string;
  todayLabel: string;
};

const initialActionState: RestDayActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({ state }: { state: RestDayActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.status === "success"
          ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
          : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
      }
      role={state.status === "success" ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--foreground)]">
      {children}
    </span>
  );
}

export function TodayRestDayCard({
  backfilledDates,
  hasCardio,
  hasStrength,
  restDay,
  setupError,
  todayLabel,
}: TodayRestDayCardProps) {
  const [state, formAction, pending] = useActionState(
    logTodayRestDay,
    initialActionState,
  );
  const hasTraining = hasStrength || hasCardio;
  const canLogRestDay = !setupError && !hasTraining && !restDay;

  return (
    <section className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Today
          </p>
          <h2 className="text-2xl font-black text-[var(--foreground)]">
            {todayLabel}
          </h2>
          <div className="flex flex-wrap gap-2">
            {hasStrength ? <StatusPill>Strength recorded</StatusPill> : null}
            {hasCardio ? <StatusPill>Cardio recorded</StatusPill> : null}
            {restDay ? <StatusPill>Rest Day</StatusPill> : null}
            {!hasTraining && !restDay && !setupError ? (
              <StatusPill>No training logged yet</StatusPill>
            ) : null}
          </div>
        </div>

        {restDay ? (
          <form action={removeRestDay}>
            <input name="rest_day_id" type="hidden" value={restDay.id} />
            <button
              className="inline-flex min-h-12 w-full items-center justify-center rounded-md border border-[var(--border)] bg-white px-4 text-base font-bold text-[var(--accent)] sm:w-auto"
              type="submit"
            >
              Remove Rest Day
            </button>
          </form>
        ) : null}
      </div>

      {setupError ? (
        <div
          className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800"
          role="alert"
        >
          {setupError}
        </div>
      ) : null}

      {backfilledDates.length ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          Backfilled {backfilledDates.length} missed blank{" "}
          {backfilledDates.length === 1 ? "day" : "days"} as Rest Days.
        </div>
      ) : null}

      <ActionMessage state={state} />

      <form action={formAction}>
        <button
          className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
          disabled={pending || !canLogRestDay}
          type="submit"
        >
          {pending ? "Logging..." : "Today is Rest Day"}
        </button>
      </form>

      {hasTraining ? (
        <p className="text-sm leading-6 text-[var(--muted)]">
          Today already has training recorded, so it cannot be marked as Rest
          Day.
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--foreground)]"
          href="/workouts/new"
        >
          Start strength
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--foreground)]"
          href="/cardio/new"
        >
          Record cardio
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--foreground)]"
          href="/workouts"
        >
          Correct entries
        </Link>
      </div>
    </section>
  );
}
