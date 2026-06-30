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
  createdAt: string;
  id: string;
  exerciseId: string;
  exerciseName: string;
  setNumber: number;
  setKind: "warmup" | "working";
  weight: string;
  reps: number;
  notes: string | null;
};

export type PreviousBestSet = {
  reps: number;
  weight: string;
};

type WorkoutSetManagerProps = {
  exercises: SessionExercise[];
  previousBestByExerciseId: Record<string, PreviousBestSet>;
  sessionId: string;
  sets: SessionSet[];
};

type ExerciseSetGroup = {
  exerciseId: string;
  exerciseName: string;
  latestCreatedAt: string;
  sets: SessionSet[];
};

const initialActionState: WorkoutActionState = {
  status: "idle",
  message: "",
};
const weightStep = 2.5;
const repsStep = 1;

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

function getLatestSetForExercise(sets: SessionSet[], exerciseId: string) {
  return sets.reduce<SessionSet | null>((latest, set) => {
    if (set.exerciseId !== exerciseId) {
      return latest;
    }

    if (!latest || set.setNumber > latest.setNumber) {
      return set;
    }

    return latest;
  }, null);
}

function groupSetsByExercise(sets: SessionSet[]) {
  const groups = new Map<string, ExerciseSetGroup>();

  sets.forEach((set) => {
    const group = groups.get(set.exerciseId) ?? {
      exerciseId: set.exerciseId,
      exerciseName: set.exerciseName,
      latestCreatedAt: set.createdAt,
      sets: [],
    };

    group.sets.push(set);
    group.latestCreatedAt =
      set.createdAt > group.latestCreatedAt ? set.createdAt : group.latestCreatedAt;
    groups.set(set.exerciseId, group);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      sets: group.sets.toSorted(
        (left, right) => left.setNumber - right.setNumber,
      ),
    }))
    .toSorted((left, right) =>
      right.latestCreatedAt.localeCompare(left.latestCreatedAt),
    );
}

function formatStepperValue(value: number, valueKind: "decimal" | "integer") {
  if (valueKind === "integer") {
    return String(Math.round(value));
  }

  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function NumberStepper({
  buttonStep,
  defaultValue,
  disabled,
  decrementLabel,
  id,
  incrementLabel,
  inputMode,
  inputStep,
  name,
  placeholder,
  valueKind,
}: {
  buttonStep: number;
  defaultValue: string;
  disabled: boolean;
  decrementLabel: string;
  id: string;
  incrementLabel: string;
  inputMode: "decimal" | "numeric";
  inputStep?: number | "any";
  name: string;
  placeholder: string;
  valueKind: "decimal" | "integer";
}) {
  const [value, setValue] = useState(defaultValue);
  const browserInputStep = inputStep ?? buttonStep;

  function adjustValue(delta: number) {
    setValue((currentValue) => {
      const currentNumber = Number(currentValue);
      const safeCurrent = Number.isFinite(currentNumber) ? currentNumber : 0;
      return formatStepperValue(Math.max(0, safeCurrent + delta), valueKind);
    });
  }

  function handleChange(nextValue: string) {
    const nextNumber = Number(nextValue);

    if (Number.isFinite(nextNumber) && nextNumber < 0) {
      setValue("0");
      return;
    }

    setValue(nextValue);
  }

  return (
    <div className="grid grid-cols-[minmax(44px,auto)_1fr_minmax(44px,auto)] overflow-hidden rounded-md border border-[var(--border)] bg-white">
      <button
        aria-label={decrementLabel}
        className="min-h-12 border-r border-[var(--border)] px-3 text-lg font-bold text-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
        disabled={disabled}
        onClick={() => adjustValue(-buttonStep)}
        type="button"
      >
        -
      </button>
      <input
        className="min-h-12 w-full border-0 bg-white px-3 text-center text-base outline-none disabled:bg-[var(--surface-strong)]"
        disabled={disabled}
        id={id}
        inputMode={inputMode}
        min="0"
        name={name}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        required
        step={browserInputStep}
        type="number"
        value={value}
      />
      <button
        aria-label={incrementLabel}
        className="min-h-12 border-l border-[var(--border)] px-3 text-lg font-bold text-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
        disabled={disabled}
        onClick={() => adjustValue(buttonStep)}
        type="button"
      >
        +
      </button>
    </div>
  );
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

function PreviousBestHint({
  bestSet,
}: {
  bestSet: PreviousBestSet | undefined;
}) {
  return (
    <aside className="rounded-md border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2">
      <p className="text-xs font-bold uppercase text-[var(--accent-strong)]">
        Previous best
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">
        {bestSet
          ? `Best working set: ${bestSet.weight} kg x ${bestSet.reps}`
          : "No previous working sets yet"}
      </p>
    </aside>
  );
}

function AddSetForm({
  exerciseId,
  exerciseName,
  previousBestSet,
  sessionId,
  sets,
}: {
  exerciseId: string;
  exerciseName: string;
  previousBestSet: PreviousBestSet | undefined;
  sessionId: string;
  sets: SessionSet[];
}) {
  const [state, formAction, pending] = useActionState(
    createWorkoutSet,
    initialActionState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const latestSet = useMemo(
    () => getLatestSetForExercise(sets, exerciseId),
    [exerciseId, sets],
  );
  const nextSetNumber = useMemo(
    () => getNextSetNumber(sets, exerciseId),
    [exerciseId, sets],
  );
  const defaultSetKind = latestSet?.setKind ?? "warmup";
  const defaultWeight = latestSet?.weight ?? "";
  const defaultReps = latestSet ? String(latestSet.reps) : "";
  const fieldResetKey = `${exerciseId}-${nextSetNumber}`;

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
        Set {nextSetNumber} for {exerciseName}
      </p>

      <PreviousBestHint bestSet={previousBestSet} />

      <fieldset className="grid grid-cols-2 gap-2" key={`${fieldResetKey}-${defaultSetKind}`}>
        <legend className="sr-only">Set kind</legend>
        <label className="flex min-h-12 items-center justify-center rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--foreground)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]">
          <input
            className="sr-only"
            defaultChecked={defaultSetKind === "warmup"}
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
            defaultChecked={defaultSetKind === "working"}
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
          <NumberStepper
            key={`${fieldResetKey}-${defaultWeight}`}
            buttonStep={weightStep}
            defaultValue={defaultWeight}
            decrementLabel="Decrease weight by 2.5kg"
            disabled={pending}
            id="weight"
            incrementLabel="Increase weight by 2.5kg"
            inputMode="decimal"
            inputStep="any"
            name="weight"
            placeholder="0"
            valueKind="decimal"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor="reps"
          >
            Reps
          </label>
          <NumberStepper
            key={`${fieldResetKey}-${defaultReps}`}
            buttonStep={repsStep}
            defaultValue={defaultReps}
            decrementLabel="Decrease reps by 1"
            disabled={pending}
            id="reps"
            incrementLabel="Increase reps by 1"
            inputMode="numeric"
            name="reps"
            placeholder="10"
            valueKind="integer"
          />
        </div>
      </div>

      <details className="rounded-md border border-[var(--border)] bg-white">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-[var(--foreground)]">
          Optional set notes
        </summary>
        <div className="border-t border-[var(--border)] p-3">
          <label className="sr-only" htmlFor="set-notes">
            Optional set notes
          </label>
          <textarea
            className="min-h-16 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            disabled={pending}
            id="set-notes"
            name="notes"
            placeholder="Anything about this set"
          />
        </div>
      </details>

      <ActionMessage state={state} />

      <button
        className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
        disabled={pending}
        type="submit"
      >
        {pending ? "Adding..." : nextSetNumber > 1 ? "Add another set" : "Add set"}
      </button>
    </form>
  );
}

function WorkoutSetEntry({
  exercises,
  previousBestByExerciseId,
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
        previousBestSet={previousBestByExerciseId[activeExerciseId]}
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
          <details>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[var(--foreground)]">
                {group.exerciseName}
              </h3>
              <span className="shrink-0 text-sm font-semibold text-[var(--muted)]">
                {group.sets.length} {group.sets.length === 1 ? "set" : "sets"}
              </span>
            </summary>
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
          </details>
        </li>
      ))}
    </ul>
  );
}

export function WorkoutSetManager({
  exercises,
  previousBestByExerciseId,
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
          previousBestByExerciseId={previousBestByExerciseId}
          sessionId={sessionId}
          sets={sets}
        />
      </section>

      <details className="space-y-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Recorded sets</h2>
          <span className="text-sm font-semibold text-[var(--muted)]">
            {sets.length} saved
          </span>
        </summary>
        <SetList sessionId={sessionId} sets={sets} />
      </details>
    </div>
  );
}
