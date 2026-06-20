"use client";

import { useActionState } from "react";
import {
  createWorkoutSession,
  type WorkoutActionState,
} from "../actions";

type NewWorkoutFormProps = {
  defaultDate: string;
};

const initialActionState: WorkoutActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({ state }: { state: WorkoutActionState }) {
  if (!state.message) {
    return null;
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
          disabled={pending}
          id="workout-date"
          name="workout_date"
          required
          type="date"
        />
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-[var(--foreground)]"
          htmlFor="workout-notes"
        >
          Notes
        </label>
        <textarea
          className="min-h-24 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          disabled={pending}
          id="workout-notes"
          name="notes"
          placeholder="Optional session notes"
        />
      </div>

      <ActionMessage state={state} />

      <button
        className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
        disabled={pending}
        type="submit"
      >
        {pending ? "Creating..." : "Create workout"}
      </button>
    </form>
  );
}
