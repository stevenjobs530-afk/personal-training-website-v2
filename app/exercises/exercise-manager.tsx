"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createExercise,
  deleteExercise,
  type ExerciseActionState,
  updateExercise,
} from "./actions";

export type ExerciseListItem = {
  id: string;
  name: string;
  notes: string | null;
};

type ExerciseManagerProps = {
  exercises: ExerciseListItem[];
};

const initialActionState: ExerciseActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({ state }: { state: ExerciseActionState }) {
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

function AddExerciseForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createExercise,
    initialActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <details className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 text-sm font-bold text-[var(--foreground)]">
        <span>Add exercise</span>
        <span className="text-xs font-semibold uppercase text-[var(--accent)]">
          New
        </span>
      </summary>
      <form
        ref={formRef}
        action={formAction}
        className="space-y-4 border-t border-[var(--border)] p-4"
      >
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="new-exercise-name"
          >
            Exercise or machine
          </label>
          <input
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            id="new-exercise-name"
            name="name"
            placeholder="Chest press"
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="new-exercise-notes"
          >
            Notes
          </label>
          <textarea
            className="min-h-20 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            id="new-exercise-notes"
            name="notes"
            placeholder="Seat height, grip, machine number"
            disabled={pending}
          />
        </div>

        <ActionMessage state={state} />

        <button
          className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
          type="submit"
          disabled={pending}
        >
          {pending ? "Adding..." : "Add exercise"}
        </button>
      </form>
    </details>
  );
}

function getExerciseInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getNotePreview(notes: string | null) {
  if (!notes) {
    return null;
  }

  return notes.length > 92 ? `${notes.slice(0, 89)}...` : notes;
}

function ExerciseCard({ exercise }: { exercise: ExerciseListItem }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateExercise,
    initialActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteExercise,
    initialActionState,
  );
  const isPending = updatePending || deletePending;
  const notePreview = getNotePreview(exercise.notes);

  return (
    <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-base font-black text-[var(--accent-strong)]">
          {getExerciseInitial(exercise.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-black text-[var(--foreground)]">
            {exercise.name}
          </h3>
          <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
            {notePreview ?? "No notes yet"}
          </p>
        </div>
      </div>

      <details className="mt-3 rounded-md bg-[var(--surface-strong)]">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-[var(--accent)]">
          Manage
        </summary>
        <div className="space-y-3 border-t border-[var(--border)] p-3">
          <form action={updateAction} className="space-y-3">
            <input name="id" type="hidden" value={exercise.id} />

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--foreground)]"
                htmlFor={`exercise-name-${exercise.id}`}
              >
                Name
              </label>
              <input
                className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
                id={`exercise-name-${exercise.id}`}
                name="name"
                defaultValue={exercise.name}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--foreground)]"
                htmlFor={`exercise-notes-${exercise.id}`}
              >
                Notes
              </label>
              <textarea
                className="min-h-20 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
                id={`exercise-notes-${exercise.id}`}
                name="notes"
                defaultValue={exercise.notes ?? ""}
                disabled={isPending}
              />
            </div>

            <ActionMessage state={updateState} />

            <button
              className="min-h-11 w-full rounded-md bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
              type="submit"
              disabled={isPending}
            >
              {updatePending ? "Saving..." : "Save changes"}
            </button>
          </form>

          <form
            action={deleteAction}
            className="space-y-3"
            onSubmit={(event) => {
              if (!window.confirm(`Delete ${exercise.name}?`)) {
                event.preventDefault();
              }
            }}
          >
            <input name="id" type="hidden" value={exercise.id} />
            <ActionMessage state={deleteState} />
            <button
              className="min-h-11 w-full rounded-md border border-red-200 bg-white px-4 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:text-[var(--muted)]"
              type="submit"
              disabled={isPending}
            >
              {deletePending ? "Deleting..." : "Delete"}
            </button>
          </form>
        </div>
      </details>
    </li>
  );
}

export function ExerciseManager({ exercises }: ExerciseManagerProps) {
  return (
    <div className="space-y-6">
      <AddExerciseForm />

      <section className="space-y-3">
        <div className="flex min-h-11 items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            Saved exercises
          </h2>
          <span className="text-sm font-semibold text-[var(--muted)]">
            {exercises.length}
          </span>
        </div>

        {exercises.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {exercises.map((exercise) => (
              <ExerciseCard
                key={`${exercise.id}-${exercise.name}-${exercise.notes ?? ""}`}
                exercise={exercise}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
            No exercises saved yet. Add your first machine or movement.
          </div>
        )}
      </section>
    </div>
  );
}
