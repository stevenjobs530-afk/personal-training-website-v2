"use client";

import { useActionState, useEffect, useRef } from "react";
import { BarbellIcon } from "@phosphor-icons/react/dist/csr/Barbell";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/csr/Heartbeat";
import {
  createExercise,
  deleteReservedCardioStrengthExercises,
  deleteExercise,
  type ExerciseActionState,
  updateCardioExercise,
  updateExercise,
} from "./actions";

export type ExerciseListItem = {
  id: string;
  name: string;
  notes: string | null;
};

export type CardioExerciseListItem = {
  category: string;
  id: string;
  name: string;
  notes: string | null;
};

type ExerciseManagerProps = {
  cardioExercises: CardioExerciseListItem[];
  cardioLoadError: boolean;
  exercises: ExerciseListItem[];
  reservedStrengthExercises: ExerciseListItem[];
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
            <h4 className="text-sm font-black text-[var(--foreground)]">
              Rename exercise
            </h4>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--foreground)]"
                htmlFor={`exercise-name-${exercise.id}`}
              >
                Exercise name
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
              {updatePending ? "Saving..." : "Save rename"}
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

const cardioCategoryLabels: Record<string, string> = {
  indoor_walking: "Indoor Walking",
  outdoor_walking: "Outdoor Walking",
  indoor_running: "Indoor Running",
  outdoor_running: "Outdoor Running",
  cycling: "Indoor Cycling",
  elliptical: "Elliptical",
};

function CardioExerciseCard({ exercise }: { exercise: CardioExerciseListItem }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateCardioExercise,
    initialActionState,
  );
  const notePreview = getNotePreview(exercise.notes);

  return (
    <li className="flex h-full min-h-36 flex-col justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
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

      <div className="mt-3 rounded-md bg-[var(--surface-strong)] px-3 py-3 text-sm font-bold text-[var(--accent)]">
        {cardioCategoryLabels[exercise.category] ?? "Cardio"}
      </div>

      <details className="mt-3 rounded-md bg-[var(--surface-strong)]">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-bold text-[var(--accent)]">
          Manage
        </summary>
        <div className="space-y-3 border-t border-[var(--border)] p-3">
          <form action={updateAction} className="space-y-3">
            <input name="id" type="hidden" value={exercise.id} />
            <h4 className="text-sm font-black text-[var(--foreground)]">
              Rename cardio exercise
            </h4>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--foreground)]"
                htmlFor={`cardio-exercise-name-${exercise.id}`}
              >
                Cardio exercise name
              </label>
              <input
                className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
                id={`cardio-exercise-name-${exercise.id}`}
                name="name"
                defaultValue={exercise.name}
                required
                disabled={updatePending}
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-semibold text-[var(--foreground)]"
                htmlFor={`cardio-exercise-notes-${exercise.id}`}
              >
                Notes
              </label>
              <textarea
                className="min-h-20 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
                id={`cardio-exercise-notes-${exercise.id}`}
                name="notes"
                defaultValue={exercise.notes ?? ""}
                disabled={updatePending}
              />
            </div>

            <ActionMessage state={updateState} />

            <button
              className="min-h-11 w-full rounded-md bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
              type="submit"
              disabled={updatePending}
            >
              {updatePending ? "Saving..." : "Save rename"}
            </button>
          </form>
        </div>
      </details>
    </li>
  );
}

function ExerciseCategory({
  children,
  count,
  defaultOpen,
  description,
  icon,
  title,
}: {
  children: React.ReactNode;
  count: number;
  defaultOpen?: boolean;
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <details
      className="group rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm"
      open={defaultOpen}
    >
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-base font-black text-[var(--accent-strong)]">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-[var(--foreground)]">
                {title}
              </h2>
              <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-[0.68rem] font-black uppercase text-[var(--muted)]">
                {count} {count === 1 ? "exercise" : "exercises"}
              </span>
            </div>
            <p className="mt-1 text-sm leading-5 text-[var(--muted)]">
              {description}
            </p>
          </div>
        </div>
        <CaretDownIcon
          aria-hidden="true"
          className="shrink-0 transition-transform group-open:rotate-180"
          size={20}
          weight="bold"
        />
      </summary>

      <div className="pt-4">{children}</div>
    </details>
  );
}

function ReservedStrengthCleanup({
  exercises,
}: {
  exercises: ExerciseListItem[];
}) {
  const [state, formAction, pending] = useActionState(
    deleteReservedCardioStrengthExercises,
    initialActionState,
  );

  if (!exercises.length) {
    return null;
  }

  const names = exercises.map((exercise) => exercise.name).join(", ");

  return (
    <form
      action={formAction}
      className="mb-3 space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3"
      onSubmit={(event) => {
        if (!window.confirm(`Delete cardio-only strength duplicate: ${names}?`)) {
          event.preventDefault();
        }
      }}
    >
      <p className="text-sm font-semibold leading-6 text-amber-900">
        {names} {exercises.length === 1 ? "is" : "are"} kept out of Strength.
      </p>
      <ActionMessage state={state} />
      <button
        className="min-h-10 rounded-md border border-amber-300 bg-white px-3 text-sm font-bold text-amber-900 disabled:cursor-not-allowed disabled:text-[var(--muted)]"
        disabled={pending}
        type="submit"
      >
        {pending ? "Checking..." : "Delete from Strength"}
      </button>
    </form>
  );
}

export function ExerciseManager({
  cardioExercises,
  cardioLoadError,
  exercises,
  reservedStrengthExercises,
}: ExerciseManagerProps) {
  return (
    <div className="exercise-library-shell">
      <AddExerciseForm />

      <section className="space-y-3">
        <div className="flex min-h-11 items-center justify-between">
          <h2 className="text-2xl font-black text-[var(--foreground)]">
            Saved Exercises
          </h2>
          <span className="text-sm font-semibold text-[var(--muted)]">
            {exercises.length + cardioExercises.length}
          </span>
        </div>

        <div className="space-y-3">
          <ExerciseCategory
            count={exercises.length}
            defaultOpen
            description="Strength and resistance training to build muscle and improve power."
            icon={<BarbellIcon aria-hidden="true" size={24} weight="bold" />}
            title="Anaerobic"
          >
            <ReservedStrengthCleanup exercises={reservedStrengthExercises} />
            {exercises.length ? (
              <ul className="grid items-stretch gap-3 sm:grid-cols-2">
                {exercises.map((exercise) => (
                  <ExerciseCard
                    key={`${exercise.id}-${exercise.name}-${exercise.notes ?? ""}`}
                    exercise={exercise}
                  />
                ))}
              </ul>
            ) : (
              <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-base leading-7 text-[var(--muted)]">
                No strength exercises saved yet.
              </div>
            )}
          </ExerciseCategory>

          <ExerciseCategory
            count={cardioExercises.length}
            defaultOpen
            description="Cardiovascular training to improve endurance and overall health."
            icon={<HeartbeatIcon aria-hidden="true" size={24} weight="bold" />}
            title="Aerobic"
          >
            {cardioLoadError ? (
              <div
                className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800"
                role="alert"
              >
                Aerobic exercises are not available yet. Apply the cardio Supabase
                setup, then refresh this page.
              </div>
            ) : cardioExercises.length ? (
              <ul className="grid items-stretch gap-3 sm:grid-cols-2">
                {cardioExercises.map((exercise) => (
                  <CardioExerciseCard
                    key={`${exercise.id}-${exercise.name}-${exercise.notes ?? ""}`}
                    exercise={exercise}
                  />
                ))}
              </ul>
            ) : (
              <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-base leading-7 text-[var(--muted)]">
                No aerobic exercises saved yet.
              </div>
            )}
          </ExerciseCategory>
        </div>
      </section>
    </div>
  );
}
