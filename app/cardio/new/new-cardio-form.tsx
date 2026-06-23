"use client";

import { useActionState } from "react";
import {
  cardioCategories,
  createCardioEntry,
  type CardioActionState,
} from "../actions";

export type CardioExerciseOption = {
  id: string;
  name: string;
  category: string;
  defaultDistanceUnit: "km" | "mi";
};

type NewCardioFormProps = {
  defaultDate: string;
  exercises: CardioExerciseOption[];
};

const initialActionState: CardioActionState = {
  status: "idle",
  message: "",
};

const categoryLabels: Record<(typeof cardioCategories)[number], string> = {
  treadmill_running: "Treadmill running",
  indoor_walking: "Indoor walking",
  incline_walking: "Incline walking",
  stair_climber: "Stair climber",
  elliptical: "Elliptical",
  cycling: "Cycling",
  rowing: "Rowing machine",
  outdoor_running: "Outdoor running",
  outdoor_walking: "Outdoor walking",
  other: "Other cardio",
};

function ActionMessage({ state }: { state: CardioActionState }) {
  if (!state.message) {
    return null;
  }

  const toneClass =
    state.status === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <p className={`rounded-md border px-3 py-2 text-sm font-semibold ${toneClass}`}>
      {state.message}
    </p>
  );
}

export function NewCardioForm({ defaultDate, exercises }: NewCardioFormProps) {
  const [state, formAction, pending] = useActionState(
    createCardioEntry,
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
          htmlFor="cardio-date"
        >
          Cardio date
        </label>
        <input
          className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          defaultValue={defaultDate}
          disabled={pending}
          id="cardio-date"
          name="cardio_date"
          required
          type="date"
        />
      </div>

      <section className="space-y-3 rounded-md border border-[var(--border)] bg-white p-3">
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="cardio-exercise-id"
          >
            Cardio exercise
          </label>
          <select
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            disabled={pending}
            id="cardio-exercise-id"
            name="cardio_exercise_id"
          >
            <option value="">Create new below</option>
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </div>

        <details open={!exercises.length}>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-[var(--accent)]">
            New cardio exercise
          </summary>
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--foreground)]"
                htmlFor="new-exercise-name"
              >
                Name
              </label>
              <input
                className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
                disabled={pending}
                id="new-exercise-name"
                name="new_exercise_name"
                placeholder="Indoor Walking"
                type="text"
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--foreground)]"
                htmlFor="category"
              >
                Category
              </label>
              <select
                className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
                defaultValue="indoor_walking"
                disabled={pending}
                id="category"
                name="category"
              >
                {cardioCategories.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </details>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="duration-minutes"
          >
            Duration
          </label>
          <div className="grid grid-cols-[1fr_auto] overflow-hidden rounded-md border border-[var(--border)] bg-white">
            <input
              className="min-h-12 w-full border-0 bg-white px-3 text-base outline-none disabled:bg-[var(--surface-strong)]"
              disabled={pending}
              id="duration-minutes"
              inputMode="numeric"
              min="1"
              name="duration_minutes"
              placeholder="30"
              required
              step="1"
              type="number"
            />
            <span className="flex min-h-12 items-center border-l border-[var(--border)] px-3 text-sm font-semibold text-[var(--muted)]">
              min
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="distance-value"
          >
            Distance
          </label>
          <input
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            disabled={pending}
            id="distance-value"
            inputMode="decimal"
            min="0"
            name="distance_value"
            placeholder="3"
            step="any"
            type="number"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="distance-unit"
          >
            Unit
          </label>
          <select
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            defaultValue="km"
            disabled={pending}
            id="distance-unit"
            name="distance_unit"
          >
            <option value="km">km</option>
            <option value="mi">mi</option>
          </select>
        </div>
      </div>

      <details className="rounded-md border border-[var(--border)] bg-white">
        <summary className="flex min-h-12 cursor-pointer items-center px-3 text-sm font-semibold text-[var(--foreground)]">
          Optional details
        </summary>
        <div className="grid gap-3 border-t border-[var(--border)] p-3">
          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-[var(--foreground)]"
              htmlFor="calories"
            >
              Calories
            </label>
            <input
              className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
              disabled={pending}
              id="calories"
              inputMode="numeric"
              min="0"
              name="calories"
              placeholder="Optional"
              step="1"
              type="number"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="notes">
              Notes
            </label>
            <textarea
              className="min-h-16 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
              disabled={pending}
              id="notes"
              name="notes"
              placeholder="Optional"
            />
          </div>
        </div>
      </details>

      <ActionMessage state={state} />

      <button
        className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving..." : "Save cardio"}
      </button>
    </form>
  );
}
