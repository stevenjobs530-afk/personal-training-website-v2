"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  createWorkoutExercise,
  createWorkoutSet,
  deleteWorkoutSet,
  type WorkoutActionState,
} from "../actions";

export type SessionExercise = {
  id: string;
  name: string;
};

export type SessionSet = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  setKind: "warmup" | "working";
  weight: string;
  reps: number;
  notes: string | null;
};

type WorkoutSetManagerProps = {
  exercises: SessionExercise[];
  sessionId: string;
  sets: SessionSet[];
};

type ExerciseSetGroup = {
  exerciseId: string;
  exerciseName: string;
  sets: SessionSet[];
};

const initialActionState: WorkoutActionState = {
  status: "idle",
  message: "",
};

function ActionMessage({ state }: { state: WorkoutActionState }) {
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

function getNextSetNumber(sets: SessionSet[], exerciseId: string) {
  const highestSetNumber = sets.reduce((highest, set) => {
    if (set.exerciseId !== exerciseId) {
      return highest;
    }

    return Math.max(highest, set.setNumber);
  }, 0);

  return highestSetNumber + 1;
}

function groupSetsByExercise(sets: SessionSet[]) {
  const groups = new Map<string, ExerciseSetGroup>();

  sets.forEach((set) => {
    const group = groups.get(set.exerciseId) ?? {
      exerciseId: set.exerciseId,
      exerciseName: set.exerciseName,
      sets: [],
    };

    group.sets.push(set);
    groups.set(set.exerciseId, group);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    sets: group.sets.toSorted(
      (left, right) => left.setNumber - right.setNumber,
    ),
  }));
}

function InlineExerciseForm({
  onCreated,
  sessionId,
}: {
  onCreated: (exerciseId: string) => void;
  sessionId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createWorkoutExercise,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();

      if (state.createdExerciseId) {
        onCreated(state.createdExerciseId);
      }
    }
  }, [onCreated, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-3 rounded-md border border-[var(--border)] bg-white p-3"
    >
      <input name="session_id" type="hidden" value={sessionId} />
      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-[var(--foreground)]"
          htmlFor="new-workout-exercise-name"
        >
          New exercise
        </label>
        <input
          className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          disabled={pending}
          id="new-workout-exercise-name"
          name="name"
          placeholder="Exercise or machine name"
          required
          type="text"
        />
      </div>
      <ActionMessage state={state} />
      <button
        className="min-h-11 w-full rounded-md border border-[var(--accent)] bg-white px-4 text-sm font-bold text-[var(--accent)] disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[var(--muted)]"
        disabled={pending}
        type="submit"
      >
        {pending ? "Adding..." : "Add exercise"}
      </button>
    </form>
  );
}

function AddSetForm({
  exerciseId,
  exerciseName,
  sessionId,
  sets,
}: {
  exerciseId: string;
  exerciseName: string;
  sessionId: string;
  sets: SessionSet[];
}) {
  const [state, formAction, pending] = useActionState(
    createWorkoutSet,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const nextSetNumber = useMemo(
    () => getNextSetNumber(sets, exerciseId),
    [exerciseId, sets],
  );

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <input name="session_id" type="hidden" value={sessionId} />
      <input name="exercise_id" type="hidden" value={exerciseId} />

      <p className="rounded-md bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]">
        Adding sets for {exerciseName}
      </p>

      <fieldset className="grid grid-cols-2 gap-2">
        <legend className="sr-only">Set kind</legend>
        <label className="flex min-h-12 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--foreground)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]">
          <input
            className="sr-only"
            defaultChecked
            disabled={pending}
            name="set_kind"
            type="radio"
            value="warmup"
          />
          Warmup
        </label>
        <label className="flex min-h-12 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--foreground)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]">
          <input
            className="sr-only"
            disabled={pending}
            name="set_kind"
            type="radio"
            value="working"
          />
          Working
        </label>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="set-number"
          >
            Set
          </label>
          <input
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            disabled={pending}
            id="set-number"
            key={`${exerciseId}-${nextSetNumber}`}
            min="1"
            name="set_number"
            required
            type="number"
            defaultValue={nextSetNumber}
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="weight"
          >
            Weight
          </label>
          <input
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            disabled={pending}
            id="weight"
            min="0"
            name="weight"
            placeholder="0"
            required
            step="0.25"
            type="number"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="reps"
          >
            Reps
          </label>
          <input
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            disabled={pending}
            id="reps"
            min="0"
            name="reps"
            placeholder="10"
            required
            step="1"
            type="number"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label
          className="text-sm font-semibold text-[var(--foreground)]"
          htmlFor="set-notes"
        >
          Notes
        </label>
        <textarea
          className="min-h-20 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          disabled={pending}
          id="set-notes"
          name="notes"
          placeholder="Optional set notes"
        />
      </div>

      <ActionMessage state={state} />

      <button
        className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
        disabled={pending}
        type="submit"
      >
        {pending ? "Adding..." : "Add set"}
      </button>
    </form>
  );
}

function WorkoutSetEntry({
  exercises,
  sessionId,
  sets,
}: WorkoutSetManagerProps) {
  const [selectedExerciseId, setSelectedExerciseId] = useState(
    exercises[0]?.id ?? "",
  );
  const selectedExercise =
    exercises.find((exercise) => exercise.id === selectedExerciseId) ??
    exercises[0];
  const activeExerciseId = selectedExercise?.id ?? "";
  const activeExerciseName = selectedExercise?.name ?? "";

  if (!exercises.length) {
    return (
      <div className="space-y-4 rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            Add your first exercise
          </h3>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Create one here, then add warmup and working sets under it.
          </p>
        </div>
        <InlineExerciseForm
          onCreated={setSelectedExerciseId}
          sessionId={sessionId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="exercise-id"
          >
            Exercise
          </label>
          <select
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)]"
            id="exercise-id"
            onChange={(event) => setSelectedExerciseId(event.target.value)}
            required
            value={activeExerciseId}
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </div>

        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-[var(--accent)]">
            New exercise
          </summary>
          <div className="pt-2">
            <InlineExerciseForm
              onCreated={setSelectedExerciseId}
              sessionId={sessionId}
            />
          </div>
        </details>
      </section>

      <AddSetForm
        exerciseId={activeExerciseId}
        exerciseName={activeExerciseName}
        sessionId={sessionId}
        sets={sets}
      />
    </div>
  );
}

function DeleteSetForm({
  sessionId,
  set,
}: {
  sessionId: string;
  set: SessionSet;
}) {
  const [state, formAction, pending] = useActionState(
    deleteWorkoutSet,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        if (!window.confirm(`Delete set ${set.setNumber} for ${set.exerciseName}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="session_id" type="hidden" value={sessionId} />
      <input name="set_id" type="hidden" value={set.id} />
      <ActionMessage state={state} />
      <button
        className="min-h-10 rounded-md border border-red-200 bg-white px-3 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:text-[var(--muted)]"
        disabled={pending}
        type="submit"
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
    </form>
  );
}

function SetList({
  sessionId,
  sets,
}: {
  sessionId: string;
  sets: SessionSet[];
}) {
  const groups = groupSetsByExercise(sets);

  if (!sets.length) {
    return (
      <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
        No sets recorded yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <li
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
          key={group.exerciseId}
        >
          <h3 className="text-base font-bold text-[var(--foreground)]">
            {group.exerciseName}
          </h3>
          <ul className="mt-3 space-y-3">
            {group.sets.map((set) => (
              <li
                className="flex flex-col gap-3 rounded-md bg-[var(--surface-strong)] p-3 sm:flex-row sm:items-start sm:justify-between"
                key={set.id}
              >
                <div className="space-y-2">
                  <span className="inline-flex rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-bold uppercase text-[var(--muted)]">
                    {set.setKind}
                  </span>
                  <p className="text-lg font-bold text-[var(--foreground)]">
                    Set {set.setNumber}: {set.weight} x {set.reps}
                  </p>
                  {set.notes ? (
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {set.notes}
                    </p>
                  ) : null}
                </div>
                <DeleteSetForm sessionId={sessionId} set={set} />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export function WorkoutSetManager({
  exercises,
  sessionId,
  sets,
}: WorkoutSetManagerProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex min-h-11 items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Add set</h2>
          <span className="text-sm font-semibold text-[var(--muted)]">
            {sets.length} saved
          </span>
        </div>
        <WorkoutSetEntry
          exercises={exercises}
          sessionId={sessionId}
          sets={sets}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-[var(--foreground)]">Recorded sets</h2>
        <SetList sessionId={sessionId} sets={sets} />
      </section>
    </div>
  );
}
