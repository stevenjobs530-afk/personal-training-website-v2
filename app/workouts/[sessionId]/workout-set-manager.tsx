"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createWorkoutExercise,
  createWorkoutSet,
  deleteWorkoutSet,
  updateWorkoutSet,
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
const restTimerStorageKey = "workout-rest-duration-seconds";
const restTimerStorageEvent = "workout-rest-duration-change";
const defaultRestDurationSeconds = 120;
const minRestDurationSeconds = 30;
const maxRestDurationSeconds = 600;
const restDurationStepSeconds = 30;

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

function RestTimer({ startSignal }: { startSignal: number }) {
  const durationSeconds = useSyncExternalStore(
    subscribeToRestDuration,
    getRestDurationSnapshot,
    getRestDurationServerSnapshot,
  );
  const [activeTotalSeconds, setActiveTotalSeconds] = useState(defaultRestDurationSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const handledStartSignalRef = useRef(0);
  const isRunning = endsAt !== null;
  const visibleRemaining = remainingSeconds ?? durationSeconds;
  const progressPercent =
    remainingSeconds === null
      ? 0
      : Math.min(
          100,
          Math.max(0, ((activeTotalSeconds - remainingSeconds) / activeTotalSeconds) * 100),
        );

  const startTimer = useCallback((duration = durationSeconds) => {
    const nextDuration = clampRestDuration(duration);

    setActiveTotalSeconds(nextDuration);
    setRemainingSeconds(nextDuration);
    setCompleted(false);
    setEndsAt(Date.now() + nextDuration * 1000);
  }, [durationSeconds]);

  useEffect(() => {
    if (startSignal > 0 && handledStartSignalRef.current !== startSignal) {
      handledStartSignalRef.current = startSignal;
      startTimer();
    }
  }, [startSignal, startTimer]);

  useEffect(() => {
    if (!endsAt) {
      return;
    }

    const updateRemaining = () => {
      const nextRemaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setRemainingSeconds(nextRemaining);

      if (nextRemaining <= 0) {
        setEndsAt(null);
        setCompleted(true);
      }
    };
    const intervalId = window.setInterval(updateRemaining, 250);

    updateRemaining();

    return () => window.clearInterval(intervalId);
  }, [endsAt]);

  function adjustDuration(deltaSeconds: number) {
    const nextDuration = clampRestDuration(durationSeconds + deltaSeconds);
    saveRestDuration(nextDuration);
  }

  function clearTimer() {
    setEndsAt(null);
    setRemainingSeconds(null);
    setCompleted(false);
  }

  return (
    <section className="rest-timer-card space-y-3 rounded-md border border-[var(--border)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--foreground)]">Rest timer</h3>
          <p className="text-sm leading-6 text-[var(--muted)]">
            {isRunning
              ? "Counting down after the saved set."
              : completed
                ? "Rest complete. Ready for the next set."
                : "Starts after you save a new set."}
          </p>
        </div>

        <div className="grid min-w-36 grid-cols-[44px_1fr_44px] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--surface)]">
          <button
            aria-label="Decrease rest time by 30 seconds"
            className="min-h-11 border-r border-[var(--border)] text-base font-bold text-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
            disabled={durationSeconds <= minRestDurationSeconds}
            onClick={() => adjustDuration(-restDurationStepSeconds)}
            type="button"
          >
            -
          </button>
          <output className="flex min-h-11 items-center justify-center px-3 text-sm font-bold text-[var(--foreground)]">
            {formatDuration(durationSeconds)}
          </output>
          <button
            aria-label="Increase rest time by 30 seconds"
            className="min-h-11 border-l border-[var(--border)] text-base font-bold text-[var(--accent)] disabled:cursor-not-allowed disabled:text-[var(--muted)]"
            disabled={durationSeconds >= maxRestDurationSeconds}
            onClick={() => adjustDuration(restDurationStepSeconds)}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <div
        aria-live="polite"
        className={
          completed
            ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3"
            : "rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-3"
        }
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--muted)]">
            {isRunning ? "Next set in" : completed ? "Done" : "Ready"}
          </span>
          <span className="font-mono text-2xl font-bold text-[var(--foreground)]">
            {formatDuration(visibleRemaining)}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--border)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="min-h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-bold text-[var(--foreground)]"
          onClick={() => startTimer()}
          type="button"
        >
          {isRunning ? "Restart" : "Start rest"}
        </button>
        <button
          className="min-h-10 rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold text-[var(--muted)] disabled:cursor-not-allowed disabled:text-[var(--border)]"
          disabled={!isRunning && !completed && remainingSeconds === null}
          onClick={clearTimer}
          type="button"
        >
          Clear
        </button>
      </div>
    </section>
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

function clampRestDuration(value: number) {
  if (!Number.isFinite(value)) {
    return defaultRestDurationSeconds;
  }

  return Math.min(
    maxRestDurationSeconds,
    Math.max(minRestDurationSeconds, Math.round(value / restDurationStepSeconds) * restDurationStepSeconds),
  );
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getStoredRestDuration() {
  if (typeof window === "undefined") {
    return defaultRestDurationSeconds;
  }

  const storedValue = Number(window.localStorage.getItem(restTimerStorageKey));

  return clampRestDuration(storedValue);
}

function getRestDurationSnapshot() {
  return getStoredRestDuration();
}

function getRestDurationServerSnapshot() {
  return defaultRestDurationSeconds;
}

function subscribeToRestDuration(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(restTimerStorageEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(restTimerStorageEvent, callback);
  };
}

function saveRestDuration(durationSeconds: number) {
  window.localStorage.setItem(restTimerStorageKey, String(durationSeconds));
  window.dispatchEvent(new Event(restTimerStorageEvent));
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
  onSetSaved,
  previousBestSet,
  sessionId,
  sets,
}: {
  exerciseId: string;
  exerciseName: string;
  onSetSaved: () => void;
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
  const handledStateRef = useRef<WorkoutActionState | null>(null);

  useEffect(() => {
    if (state.status === "success" && handledStateRef.current !== state) {
      handledStateRef.current = state;
      formRef.current?.reset();
      onSetSaved();
    }
  }, [onSetSaved, state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="set-entry-card space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
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
        {pending ? "Saving..." : "Save set + start rest"}
      </button>
    </form>
  );
}

function WorkoutSetEntry({
  exercises,
  onSetSaved,
  previousBestByExerciseId,
  sessionId,
  sets,
}: WorkoutSetManagerProps & { onSetSaved: () => void }) {
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
        onSetSaved={onSetSaved}
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

function getSetKindLabel(setKind: SessionSet["setKind"]) {
  return setKind === "warmup" ? "Warmup" : "Working";
}

function formatSetSummary(set: SessionSet) {
  return `${set.weight} kg x ${set.reps}`;
}

function EditSetForm({
  onCancel,
  onSaved,
  sessionId,
  set,
}: {
  onCancel: () => void;
  onSaved: () => void;
  sessionId: string;
  set: SessionSet;
}) {
  const [state, formAction, pending] = useActionState(
    updateWorkoutSet,
    initialActionState,
  );
  const [selectedSetKind, setSelectedSetKind] = useState(set.setKind);
  const affectsProgress =
    set.setKind === "working" && selectedSetKind === "warmup";
  const fieldIdPrefix = `edit-set-${set.id}`;
  const handledStateRef = useRef<WorkoutActionState | null>(null);

  useEffect(() => {
    if (state.status === "success" && handledStateRef.current !== state) {
      handledStateRef.current = state;
      onSaved();
    }
  }, [onSaved, state]);

  function handleSetKindChange(value: string) {
    if (value === "warmup" || value === "working") {
      setSelectedSetKind(value);
    }
  }

  return (
    <form action={formAction} className="min-w-0 space-y-3">
      <input name="session_id" type="hidden" value={sessionId} />
      <input name="set_id" type="hidden" value={set.id} />

      <div className="grid gap-3 sm:grid-cols-[minmax(7rem,0.8fr)_minmax(7rem,1fr)_minmax(6rem,0.9fr)]">
        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor={`${fieldIdPrefix}-kind`}
          >
            Set {set.setNumber}
          </label>
          <select
            className="min-h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm font-bold uppercase text-[var(--foreground)] outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            disabled={pending}
            id={`${fieldIdPrefix}-kind`}
            name="set_kind"
            onChange={(event) => handleSetKindChange(event.target.value)}
            value={selectedSetKind}
          >
            <option value="warmup">Warmup</option>
            <option value="working">Working</option>
          </select>
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-semibold text-[var(--foreground)]"
            htmlFor={`${fieldIdPrefix}-weight`}
          >
            Weight
          </label>
          <NumberStepper
            key={`${set.id}-weight-${set.weight}`}
            buttonStep={weightStep}
            defaultValue={set.weight}
            decrementLabel={`Decrease set ${set.setNumber} weight by 2.5kg`}
            disabled={pending}
            id={`${fieldIdPrefix}-weight`}
            incrementLabel={`Increase set ${set.setNumber} weight by 2.5kg`}
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
            htmlFor={`${fieldIdPrefix}-reps`}
          >
            Reps
          </label>
          <NumberStepper
            key={`${set.id}-reps-${set.reps}`}
            buttonStep={repsStep}
            defaultValue={String(set.reps)}
            decrementLabel={`Decrease set ${set.setNumber} reps by 1`}
            disabled={pending}
            id={`${fieldIdPrefix}-reps`}
            incrementLabel={`Increase set ${set.setNumber} reps by 1`}
            inputMode="numeric"
            name="reps"
            placeholder="10"
            valueKind="integer"
          />
        </div>
      </div>

      {affectsProgress ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          This will affect Progress stats.
        </p>
      ) : null}

      <details
        className="rounded-md border border-[var(--border)] bg-white"
        open={Boolean(set.notes)}
      >
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-[var(--foreground)]">
          Optional set notes
        </summary>
        <div className="border-t border-[var(--border)] p-3">
          <label className="sr-only" htmlFor={`${fieldIdPrefix}-notes`}>
            Optional set notes
          </label>
          <textarea
            className="min-h-16 w-full resize-y rounded-md border border-[var(--border)] bg-white px-3 py-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            defaultValue={set.notes ?? ""}
            disabled={pending}
            id={`${fieldIdPrefix}-notes`}
            name="notes"
            placeholder="Anything about this set"
          />
        </div>
      </details>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          className="min-h-11 rounded-md bg-[var(--accent)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
          disabled={pending}
          type="submit"
        >
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          className="min-h-11 rounded-md border border-[var(--border)] bg-white px-4 text-sm font-bold text-[var(--muted)] disabled:cursor-not-allowed disabled:text-[var(--border)]"
          disabled={pending}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function SetListItem({
  sessionId,
  set,
}: {
  sessionId: string;
  set: SessionSet;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] p-3">
        <EditSetForm
          onCancel={() => setIsEditing(false)}
          onSaved={() => setIsEditing(false)}
          sessionId={sessionId}
          set={set}
        />
      </li>
    );
  }

  return (
    <li className="grid gap-3 rounded-md border border-[var(--border)] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[var(--surface-strong)] px-2 py-1 text-xs font-bold uppercase text-[var(--muted)]">
            Set {set.setNumber}
          </span>
          <span
            className={
              set.setKind === "working"
                ? "rounded-md bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold uppercase text-[var(--accent-strong)]"
                : "rounded-md bg-white px-2 py-1 text-xs font-bold uppercase text-[var(--muted)] ring-1 ring-[var(--border)]"
            }
          >
            {getSetKindLabel(set.setKind)}
          </span>
          {set.notes ? (
            <span className="rounded-md bg-[var(--surface)] px-2 py-1 text-xs font-bold uppercase text-[var(--muted)] ring-1 ring-[var(--border)]">
              Notes
            </span>
          ) : null}
        </div>
        <p className="truncate text-base font-bold text-[var(--foreground)]">
          {formatSetSummary(set)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          className="min-h-10 rounded-md border border-[var(--accent)] bg-white px-3 text-sm font-bold text-[var(--accent)]"
          onClick={() => setIsEditing(true)}
          type="button"
        >
          Edit
        </button>
        <DeleteSetForm sessionId={sessionId} set={set} />
      </div>
    </li>
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
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-[var(--foreground)]">
                  {group.exerciseName}
                </h3>
                <p className="mt-1 text-sm font-semibold text-[var(--muted)]">
                  Latest: {formatSetSummary(group.sets[group.sets.length - 1])}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-white px-2 py-1 text-sm font-semibold text-[var(--muted)] ring-1 ring-[var(--border)]">
                {group.sets.length} {group.sets.length === 1 ? "set" : "sets"}
              </span>
            </summary>
            <ul className="mt-3 space-y-3">
              {group.sets.map((set) => (
                <SetListItem key={set.id} sessionId={sessionId} set={set} />
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
  const [restTimerStartSignal, setRestTimerStartSignal] = useState(0);
  const handleSetSaved = useCallback(() => {
    setRestTimerStartSignal(Date.now());
  }, []);

  return (
    <div className="workout-session-layout">
      <section className="workout-entry-panel">
        <header>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Add set</h2>
          <span className="text-sm font-semibold text-[var(--muted)]">
            {sets.length} saved
          </span>
        </header>
        <WorkoutSetEntry
          exercises={exercises}
          onSetSaved={handleSetSaved}
          previousBestByExerciseId={previousBestByExerciseId}
          sessionId={sessionId}
          sets={sets}
        />
      </section>

      <aside className="workout-session-side">
        <details className="space-y-3" open>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--foreground)]">Recorded sets</h2>
            <span className="text-sm font-semibold text-[var(--muted)]">
              {sets.length} saved
            </span>
          </summary>
          <SetList sessionId={sessionId} sets={sets} />
        </details>
        <RestTimer startSignal={restTimerStartSignal} />
      </aside>
    </div>
  );
}
