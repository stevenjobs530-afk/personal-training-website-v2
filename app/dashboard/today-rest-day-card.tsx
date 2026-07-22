"use client";

import Link from "next/link";
import { LeafIcon } from "@phosphor-icons/react/dist/csr/Leaf";
import { useActionState } from "react";
import {
  logTodayRestDay,
  type RestDayActionState,
} from "@/app/_actions/rest-days";
import { RestDayRemoval } from "@/app/_components/rest-day-removal";
import type { AppLocale } from "@/lib/preferences-types";

type TodayRestDayCardProps = {
  backfilledDates: string[];
  children: React.ReactNode;
  hasCardio: boolean;
  hasStrength: boolean;
  locale: AppLocale;
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
  locale,
  restDay,
  setupError,
  todayLabel,
}: TodayRestDayCardProps) {
  const [state, formAction, pending] = useActionState(
    logTodayRestDay,
    initialActionState,
  );
  const hasTraining = hasStrength || hasCardio;
  const zh = locale === "zh";
  const canLogRestDay = !setupError && !hasTraining && !restDay;

  return (
    <div className="today-layout">
      <section className="today-status-panel">
        <div className="today-status-heading">
          <div>
            <p className="today-date-label">{zh ? "今天" : "Today"}</p>
            <h2 className="today-date">{todayLabel}</h2>
          </div>

          {restDay ? (
            <RestDayRemoval restDayId={restDay.id} />
          ) : null}
        </div>

        <div className="today-status-pills">
            {hasStrength ? <StatusPill>{zh ? "已记录力量训练" : "Strength recorded"}</StatusPill> : null}
            {hasCardio ? <StatusPill>{zh ? "已记录有氧训练" : "Cardio recorded"}</StatusPill> : null}
            {restDay ? <StatusPill>{zh ? "休息日" : "Rest Day"}</StatusPill> : null}
            {!hasTraining && !restDay && !setupError ? (
              <StatusPill>{zh ? "今天还没有训练记录" : "No training logged yet"}</StatusPill>
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
            {zh ? "今天已经有训练记录，不能标记为休息日。" : "Today already has training recorded, so it cannot be marked as Rest Day."}
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
            <h2>{zh ? "恢复" : "Recovery"}</h2>
            <p className="recovery-card-copy">
              {zh ? "将空白日期标记为恢复日，或打开最近活动更正记录。" : "Mark a blank day as recovery, or open recent activity to correct an entry."}
            </p>
          </div>

          <div className="recovery-actions">
            <form action={formAction}>
              <button
                className="recovery-primary w-full"
                disabled={pending || !canLogRestDay}
                type="submit"
              >
                {pending ? (zh ? "正在记录…" : "Logging...") : zh ? "今天是休息日" : "Today is Rest Day"}
              </button>
            </form>
            <Link className="recovery-secondary" href="/workouts">
              {zh ? "更正记录" : "Correct entries"}
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}
