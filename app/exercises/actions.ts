"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isReservedCardioExerciseName } from "@/lib/training/cardio-reserved";

export type ExerciseActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

type ActionContext =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof createClient>>;
      userId: string;
    }
  | {
      ok: false;
      state: ExerciseActionState;
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
        message: "Sign in again before changing exercises.",
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

function revalidateExerciseViews() {
  revalidatePath("/exercises");
  revalidatePath("/workouts");
  revalidatePath("/history");
  revalidatePath("/progress");
  revalidatePath("/cardio");
}

function validateName(name: string): ExerciseActionState | null {
  if (!name) {
    return {
      status: "error",
      message: "Enter an exercise or machine name.",
    };
  }

  if (isReservedCardioExerciseName(name)) {
    return {
      status: "error",
      message: "Use Cardio for this exercise. Strength is for resistance work.",
    };
  }

  return null;
}

function validateCardioName(name: string): ExerciseActionState | null {
  if (!name) {
    return {
      status: "error",
      message: "Enter a cardio exercise name.",
    };
  }

  return null;
}

function getSaveErrorMessage(error: DatabaseError) {
  if (error.code === "23505" || error.message?.includes("exercises_user_name_unique")) {
    return "An exercise with this name already exists.";
  }

  if (error.code === "23514") {
    return "Enter an exercise or machine name.";
  }

  return "The exercise could not be saved. Try again.";
}

function getCardioSaveErrorMessage(error: DatabaseError) {
  if (
    error.code === "23505" ||
    error.message?.includes("cardio_exercises_user_name_unique")
  ) {
    return "A cardio exercise with this name already exists.";
  }

  if (error.code === "23514") {
    return "Enter a cardio exercise name.";
  }

  return "The cardio exercise could not be saved. Try again.";
}

function getDeleteErrorMessage(error: DatabaseError) {
  if (error.code === "23503") {
    return "This exercise is already used by workout sets, so it cannot be deleted.";
  }

  return "The exercise could not be deleted. Try again.";
}

export async function createExercise(
  _previousState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const name = getTrimmedValue(formData, "name");
  const validationError = validateName(name);

  if (validationError) {
    return validationError;
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const notes = getOptionalText(formData, "notes");
  const { error } = await context.supabase.from("exercises").insert({
    user_id: context.userId,
    name,
    notes,
  });

  if (error) {
    return {
      status: "error",
      message: getSaveErrorMessage(error),
    };
  }

  revalidatePath("/exercises");

  return {
    status: "success",
    message: "Exercise added.",
  };
}

export async function updateExercise(
  _previousState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const id = getTrimmedValue(formData, "id");
  const name = getTrimmedValue(formData, "name");
  const validationError = validateName(name);

  if (!id) {
    return {
      status: "error",
      message: "The exercise could not be found.",
    };
  }

  if (validationError) {
    return validationError;
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const notes = getOptionalText(formData, "notes");
  const { data, error } = await context.supabase
    .from("exercises")
    .update({ name, notes })
    .eq("id", id)
    .eq("user_id", context.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: getSaveErrorMessage(error),
    };
  }

  if (!data) {
    return {
      status: "error",
      message: "The exercise could not be found.",
    };
  }

  revalidateExerciseViews();

  return {
    status: "success",
    message: "Exercise renamed.",
  };
}

export async function updateCardioExercise(
  _previousState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const id = getTrimmedValue(formData, "id");
  const name = getTrimmedValue(formData, "name");
  const validationError = validateCardioName(name);

  if (!id) {
    return {
      status: "error",
      message: "The cardio exercise could not be found.",
    };
  }

  if (validationError) {
    return validationError;
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const notes = getOptionalText(formData, "notes");
  const { data, error } = await context.supabase
    .from("cardio_exercises")
    .update({ name, notes })
    .eq("id", id)
    .eq("user_id", context.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: getCardioSaveErrorMessage(error),
    };
  }

  if (!data) {
    return {
      status: "error",
      message: "The cardio exercise could not be found.",
    };
  }

  revalidateExerciseViews();

  return {
    status: "success",
    message: "Cardio exercise renamed.",
  };
}

export async function deleteExercise(
  _previousState: ExerciseActionState,
  formData: FormData,
): Promise<ExerciseActionState> {
  const id = getTrimmedValue(formData, "id");

  if (!id) {
    return {
      status: "error",
      message: "The exercise could not be found.",
    };
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const { data, error } = await context.supabase
    .from("exercises")
    .delete()
    .eq("id", id)
    .eq("user_id", context.userId)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      status: "error",
      message: getDeleteErrorMessage(error),
    };
  }

  if (!data) {
    return {
      status: "error",
      message: "The exercise could not be found.",
    };
  }

  revalidateExerciseViews();

  return {
    status: "success",
    message: "Exercise deleted.",
  };
}

export async function deleteReservedCardioStrengthExercises(
  _previousState: ExerciseActionState,
  _formData: FormData,
): Promise<ExerciseActionState> {
  void _previousState;
  void _formData;

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const { data: exercises, error: exerciseError } = await context.supabase
    .from("exercises")
    .select("id, name")
    .eq("user_id", context.userId);

  if (exerciseError) {
    return {
      status: "error",
      message: "Strength exercises could not be checked. Try again.",
    };
  }

  const reservedExercises = (exercises ?? []).filter((exercise) =>
    isReservedCardioExerciseName(exercise.name),
  );
  const reservedIds = reservedExercises.map((exercise) => exercise.id);

  if (!reservedIds.length) {
    return {
      status: "success",
      message: "No cardio-only strength duplicates were found.",
    };
  }

  const { data: referencedSets, error: setsError } = await context.supabase
    .from("workout_sets")
    .select("exercise_id")
    .eq("user_id", context.userId)
    .in("exercise_id", reservedIds);

  if (setsError) {
    return {
      status: "error",
      message: "Strength usage could not be checked. Try again.",
    };
  }

  const referencedExerciseIds = new Set(
    (referencedSets ?? []).map((set) => set.exercise_id),
  );
  const deletableIds = reservedIds.filter((id) => !referencedExerciseIds.has(id));

  if (!deletableIds.length) {
    return {
      status: "error",
      message:
        "The cardio-only strength duplicate is already used by workout sets, so it was kept.",
    };
  }

  const { error: deleteError } = await context.supabase
    .from("exercises")
    .delete()
    .eq("user_id", context.userId)
    .in("id", deletableIds);

  if (deleteError) {
    return {
      status: "error",
      message: "The cardio-only strength duplicate could not be deleted. Try again.",
    };
  }

  revalidatePath("/exercises");
  revalidatePath("/progress");
  revalidatePath("/workouts");

  const keptCount = reservedIds.length - deletableIds.length;
  const deletedText = `${deletableIds.length} ${
    deletableIds.length === 1 ? "duplicate" : "duplicates"
  } deleted.`;
  const keptText = keptCount
    ? ` ${keptCount} ${keptCount === 1 ? "duplicate was" : "duplicates were"} kept because workout sets use it.`
    : "";

  return {
    status: "success",
    message: `${deletedText}${keptText}`,
  };
}
