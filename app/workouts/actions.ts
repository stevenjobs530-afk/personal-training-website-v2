"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type WorkoutActionState = {
  status: "idle" | "success" | "error";
  message: string;
  createdExerciseId?: string;
};

const setKinds = ["warmup", "working"] as const;

type ActionContext =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
    }
  | {
      ok: false;
      state: WorkoutActionState;
    };

type DatabaseError = {
  code?: string;
  message?: string;
};

async function getActionContext(): Promise<ActionContext> {
  if (!hasSupabaseEnv()) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Supabase is not configured for this environment yet.",
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false,
      state: {
        status: "error",
        message: "Sign in again before changing workouts.",
      },
    };
  }

  return {
    ok: true,
    supabase,
    userId: data.user.id,
  };
}

function getTrimmedValue(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function getOptionalText(formData: FormData, key: string) {
  const value = getTrimmedValue(formData, key);

  return value ? value : null;
}

function isDateInputValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getSessionErrorMessage(error: DatabaseError) {
  if (error.code === "23514") {
    return "Enter a valid workout date.";
  }

  return "The workout session could not be saved. Try again.";
}

function getSetErrorMessage(error: DatabaseError) {
  if (error.code === "23505") {
    return "This exercise already has a set with that number.";
  }

  if (error.code === "23503" || error.code === "23514") {
    return "Check the session, exercise, set number, weight, and reps.";
  }

  return "The set could not be saved. Try again.";
}

function getExerciseErrorMessage(error: DatabaseError) {
  if (error.code === "23505" || error.message?.includes("exercises_user_name_unique")) {
    return "An exercise with this name already exists.";
  }

  if (error.code === "23514") {
    return "Enter an exercise or machine name.";
  }

  return "The exercise could not be saved. Try again.";
}

function parsePositiveInteger(value: string) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

function parseNonNegativeNumber(value: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

function parseNonNegativeInteger(value: string) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    return null;
  }

  return numberValue;
}

function isSetKind(value: string): value is (typeof setKinds)[number] {
  return setKinds.includes(value as (typeof setKinds)[number]);
}

export async function createWorkoutSession(
  _previousState: WorkoutActionState,
  formData: FormData,
): Promise<WorkoutActionState> {
  const workoutDate = getTrimmedValue(formData, "workout_date");

  if (!isDateInputValue(workoutDate)) {
    return {
      status: "error",
      message: "Enter a valid workout date.",
    };
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const notes = getOptionalText(formData, "notes");
  const { data, error } = await context.supabase
    .from("workout_sessions")
    .insert({
      user_id: context.userId,
      workout_date: workoutDate,
      notes,
    })
    .select("id")
    .single();

  if (error) {
    return {
      status: "error",
      message: getSessionErrorMessage(error),
    };
  }

  revalidatePath("/workouts");
  redirect(`/workouts/${data.id}`);
}

export async function createWorkoutSet(
  _previousState: WorkoutActionState,
  formData: FormData,
): Promise<WorkoutActionState> {
  const sessionId = getTrimmedValue(formData, "session_id");
  const exerciseId = getTrimmedValue(formData, "exercise_id");
  const setKind = getTrimmedValue(formData, "set_kind");
  const setNumber = parsePositiveInteger(getTrimmedValue(formData, "set_number"));
  const weight = parseNonNegativeNumber(getTrimmedValue(formData, "weight"));
  const reps = parseNonNegativeInteger(getTrimmedValue(formData, "reps"));

  if (!sessionId) {
    return {
      status: "error",
      message: "Open a workout session before adding sets.",
    };
  }

  if (!exerciseId) {
    return {
      status: "error",
      message: "Choose an exercise.",
    };
  }

  if (!isSetKind(setKind)) {
    return {
      status: "error",
      message: "Choose warmup or working.",
    };
  }

  if (!setNumber) {
    return {
      status: "error",
      message: "Set number must be greater than 0.",
    };
  }

  if (weight === null) {
    return {
      status: "error",
      message: "Weight must be 0 or higher.",
    };
  }

  if (reps === null) {
    return {
      status: "error",
      message: "Reps must be 0 or higher.",
    };
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const notes = getOptionalText(formData, "notes");
  const { error } = await context.supabase.from("workout_sets").insert({
    user_id: context.userId,
    session_id: sessionId,
    exercise_id: exerciseId,
    set_number: setNumber,
    set_kind: setKind,
    weight,
    reps,
    notes,
  });

  if (error) {
    return {
      status: "error",
      message: getSetErrorMessage(error),
    };
  }

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${sessionId}`);

  return {
    status: "success",
    message: "Set added.",
  };
}

export async function createWorkoutExercise(
  _previousState: WorkoutActionState,
  formData: FormData,
): Promise<WorkoutActionState> {
  const sessionId = getTrimmedValue(formData, "session_id");
  const name = getTrimmedValue(formData, "name");

  if (!sessionId) {
    return {
      status: "error",
      message: "Open a workout session before adding exercises.",
    };
  }

  if (!name) {
    return {
      status: "error",
      message: "Enter an exercise or machine name.",
    };
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const { data: session, error: sessionError } = await context.supabase
    .from("workout_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (sessionError || !session) {
    return {
      status: "error",
      message: "Open a workout session before adding exercises.",
    };
  }

  const { data, error } = await context.supabase
    .from("exercises")
    .insert({
      user_id: context.userId,
      name,
      notes: null,
    })
    .select("id")
    .single();

  if (error) {
    return {
      status: "error",
      message: getExerciseErrorMessage(error),
    };
  }

  revalidatePath("/exercises");
  revalidatePath(`/workouts/${sessionId}`);

  return {
    status: "success",
    message: "Exercise added.",
    createdExerciseId: data.id,
  };
}

export async function deleteWorkoutSet(
  _previousState: WorkoutActionState,
  formData: FormData,
): Promise<WorkoutActionState> {
  const sessionId = getTrimmedValue(formData, "session_id");
  const setId = getTrimmedValue(formData, "set_id");

  if (!sessionId || !setId) {
    return {
      status: "error",
      message: "The set could not be found.",
    };
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const { data, error } = await context.supabase
    .from("workout_sets")
    .delete()
    .eq("id", setId)
    .eq("session_id", sessionId)
    .eq("user_id", context.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: "The set could not be deleted. Try again.",
    };
  }

  if (!data) {
    return {
      status: "error",
      message: "The set could not be found.",
    };
  }

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${sessionId}`);

  return {
    status: "success",
    message: "Set deleted.",
  };
}
