"use client";

import { useActionState } from "react";
import {
  logSelectedRestDay,
  type RestDayActionState,
} from "@/app/_actions/rest-days";
import { createWorkoutSession, type WorkoutActionState } from "../actions";

type NewWorkoutFormProps = {
  defaultDate: string;
};

const initialActionState: WorkoutActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({
  state,
}: {
  state: WorkoutActionState | RestDayActionState;
}) {
  if (!state.message) {
    return null;
  }

  if (state.status === "success") {
    return (
      <p
        className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
        role="status"
      >
        {state.message}
      </p>
    );
  }

  return (
    <p
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
      role="alert"
    >
      {state.message}
    </p>
  );
}

export function NewWorkoutForm({ defaultDate }: NewWorkoutFormProps) {
  const [state, formAction, pending] = useActionState(
    createWorkoutSession,
    initialActionState,
  );
  const [restState, restFormAction, restPending] = useActionState(
    logSelectedRestDay,
    initialActionState,
  );
  const busy = pending || restPending;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-[var(--foreground)]"
          htmlFor="workout-date"
        >
          Workout date
        </label>
        <input
          className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          defaultValue={defaultDate}
          disabled={busy}
          id="workout-date"
          name="workout_date"
          required
          type="date"
        />
        <p className="text-sm leading-6 text-[var(--muted)]">
          Create the session, then add exercises and sets right after.
        </p>
      </div>

      <details className="rounded-md border border-[var(--border)] bg-white">
        <summary className="flex min-h-12 cursor-pointer items-center px-3 text-sm font-semibold text-[var(--foreground)]">
          Optional session notes
        </summary>
        <div className="space-y-2 border-t border-[var(--border)] p-3">
          <label className="sr-only" htmlFor="workout-notes">
            Optional session notes
          </label>
          <textarea
            className="min-h-16 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            disabled={busy}
            id="workout-notes"
            name="notes"
            placeholder="Anything about the whole session"
          />
        </div>
      </details>

      <ActionMessage state={state} />
      <ActionMessage state={restState} />

      <button
        className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
        disabled={busy}
        type="submit"
      >
        {pending ? "Creating..." : "Create workout"}
      </button>

      <button
        className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-4 text-base font-bold text-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
        disabled={busy}
        formAction={restFormAction}
        type="submit"
      >
        {restPending ? "Logging Rest Day..." : "Log selected date as Rest Day"}
      </button>
      <p className="text-sm leading-6 text-[var(--muted)]">
        Not training? Log the selected date as a Rest Day instead.
      </p>
    </form>
  );
}
