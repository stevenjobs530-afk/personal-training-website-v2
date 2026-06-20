"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

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

function validateName(name: string): ExerciseActionState | null {
  if (!name) {
    return {
      status: "error",
      message: "Enter an exercise or machine name.",
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

  revalidatePath("/exercises");

  return {
    status: "success",
    message: "Exercise saved.",
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

  revalidatePath("/exercises");

  return {
    status: "success",
    message: "Exercise deleted.",
  };
}
