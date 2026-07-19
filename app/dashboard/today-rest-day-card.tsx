"use client";

import Link from "next/link";
import { LeafIcon } from "@phosphor-icons/react/dist/csr/Leaf";
import { useActionState } from "react";
import {
  logTodayRestDay,
  removeRestDay,
  type RestDayActionState,
} from "@/app/_actions/rest-days";

type TodayRestDayCardProps = {
  backfilledDates: string[];
  children: React.ReactNode;
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
      className={state.status === "success" ? "notice notice-success" : "notice notice-error"}
      role={state.status === "success" ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return <span className="status-pill">{children}</span>;
}

export function TodayRestDayCard({
  backfilledDates,
  children,
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
    <div className="today-layout">
      <section className="today-status-panel">
        <div className="today-status-heading">
          <div>
            <p className="today-date-label">Today</p>
            <h2 className="today-date">{todayLabel}</h2>
          </div>

          {restDay ? (
            <form action={removeRestDay}>
              <input name="rest_day_id" type="hidden" value={restDay.id} />
              <button className="recovery-secondary" type="submit">
                Remove Rest Day
              </button>
            </form>
          ) : null}
        </div>

        <div className="today-status-pills">
            {hasStrength ? <StatusPill>Strength recorded</StatusPill> : null}
            {hasCardio ? <StatusPill>Cardio recorded</StatusPill> : null}
            {restDay ? <StatusPill>Rest Day</StatusPill> : null}
            {!hasTraining && !restDay && !setupError ? (
              <StatusPill>No training logged yet</StatusPill>
            ) : null}
        </div>

        {setupError ? (
          <div className="notice notice-error" role="alert">
            {setupError}
          </div>
        ) : null}

        {backfilledDates.length ? (
          <div className="notice notice-success">
            Backfilled {backfilledDates.length} missed blank{" "}
            {backfilledDates.length === 1 ? "day" : "days"} as Rest Days.
          </div>
        ) : null}

        <ActionMessage state={state} />

        {hasTraining ? (
          <p className="text-sm leading-6 text-[var(--muted)]">
            Today already has training recorded, so it cannot be marked as Rest
            Day.
          </p>
        ) : null}
      </section>

      <div className="training-choice-grid">
        {children}
        <article className="recovery-card">
          <div>
            <span className="training-card-icon">
              <LeafIcon aria-hidden="true" size={28} weight="bold" />
            </span>
            <h2>Recovery</h2>
            <p className="recovery-card-copy">
              Mark a blank day as recovery, or open recent activity to correct
              an entry.
            </p>
          </div>

          <div className="recovery-actions">
            <form action={formAction}>
              <button
                className="recovery-primary w-full"
                disabled={pending || !canLogRestDay}
                type="submit"
              >
                {pending ? "Logging..." : "Today is Rest Day"}
              </button>
            </form>
            <Link className="recovery-secondary" href="/workouts">
              Correct entries
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
