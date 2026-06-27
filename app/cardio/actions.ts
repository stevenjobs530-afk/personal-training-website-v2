"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  cardioCategories,
  distanceUnits,
  needsCardioDistance,
  type CardioCategory,
  type DistanceUnit,
} from "./cardio-options";

export type CardioActionState = {
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
      state: CardioActionState;
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
        message: "Sign in again before changing cardio entries.",
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

function isCardioCategory(value: string): value is CardioCategory {
  return cardioCategories.includes(value as CardioCategory);
}

function isDistanceUnit(value: string): value is DistanceUnit {
  return distanceUnits.includes(value as DistanceUnit);
}

function parsePositiveInteger(value: string) {
  const numberValue = Number(value);

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return null;
  }

  return numberValue;
}

function parseOptionalPositiveNumber(value: string) {
  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return undefined;
  }

  return numberValue;
}

function getCardioErrorMessage(error: DatabaseError) {
  if (
    error.code === "23505" ||
    error.message?.includes("cardio_exercises_user_name_unique")
  ) {
    return "A cardio exercise with this name already exists.";
  }

  if (error.code === "23503" || error.code === "23514") {
    return "Check the cardio exercise, duration, distance, and calories.";
  }

  return "The cardio entry could not be saved. Try again.";
}

export async function createCardioEntry(
  _previousState: CardioActionState,
  formData: FormData,
): Promise<CardioActionState> {
  const cardioDate = getTrimmedValue(formData, "cardio_date");
  const existingExerciseId = getTrimmedValue(formData, "cardio_exercise_id");
  const newExerciseName = getTrimmedValue(formData, "new_exercise_name");
  const category = getTrimmedValue(formData, "category");
  const distanceUnit = getTrimmedValue(formData, "distance_unit");
  const durationMinutes = parsePositiveInteger(
    getTrimmedValue(formData, "duration_minutes"),
  );
  const parsedDistanceValue = parseOptionalPositiveNumber(
    getTrimmedValue(formData, "distance_value"),
  );
  const calories = parsePositiveInteger(getTrimmedValue(formData, "calories"));

  if (!isDateInputValue(cardioDate)) {
    return {
      status: "error",
      message: "Enter a valid cardio date.",
    };
  }

  if (!existingExerciseId && !newExerciseName) {
    return {
      status: "error",
      message: "Choose a cardio exercise or create a new one.",
    };
  }

  if (newExerciseName && !isCardioCategory(category)) {
    return {
      status: "error",
      message: "Choose a category for the new cardio exercise.",
    };
  }

  if (!durationMinutes) {
    return {
      status: "error",
      message: "Duration must be greater than 0 minutes.",
    };
  }

  if (parsedDistanceValue === undefined) {
    return {
      status: "error",
      message: "Distance must be greater than 0.",
    };
  }

  if (!isDistanceUnit(distanceUnit)) {
    return {
      status: "error",
      message: "Choose km or mi.",
    };
  }

  if (!calories) {
    return {
      status: "error",
      message: "Calories must be greater than 0 kcal.",
    };
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  let cardioExerciseId = existingExerciseId;

  if (newExerciseName) {
    const { data, error } = await context.supabase
      .from("cardio_exercises")
      .insert({
        user_id: context.userId,
        name: newExerciseName,
        category,
        default_distance_unit: distanceUnit,
        notes: null,
      })
      .select("id")
      .single();

    if (error) {
      return {
        status: "error",
        message: getCardioErrorMessage(error),
      };
    }

    cardioExerciseId = data.id;
  }

  const { data: exercise, error: exerciseError } = await context.supabase
    .from("cardio_exercises")
    .select("id, category")
    .eq("id", cardioExerciseId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (exerciseError || !exercise) {
    return {
      status: "error",
      message: "Choose a cardio exercise.",
    };
  }

  if (needsCardioDistance(exercise.category) && parsedDistanceValue === null) {
    return {
      status: "error",
      message: "Walking and running entries need distance in km or mi.",
    };
  }

  const distanceValue = needsCardioDistance(exercise.category)
    ? parsedDistanceValue
    : null;
  const notes = getOptionalText(formData, "notes");
  const { error } = await context.supabase.from("cardio_entries").insert({
    user_id: context.userId,
    cardio_exercise_id: cardioExerciseId,
    cardio_date: cardioDate,
    duration_seconds: durationMinutes * 60,
    distance_value: distanceValue,
    distance_unit: distanceUnit,
    calories,
    notes,
  });

  if (error) {
    return {
      status: "error",
      message: getCardioErrorMessage(error),
    };
  }

  revalidatePath("/cardio");
  revalidatePath("/history");
  revalidatePath("/cardio/new");
  redirect("/cardio");
}
