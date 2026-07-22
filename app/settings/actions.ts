"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  preferenceCookieNames,
  type AppLocale,
  type DistanceUnitPreference,
  type WeightUnitPreference,
} from "@/lib/preferences";

export type DeleteHistoryState = {
  message: string;
  status: "idle" | "success" | "error";
};

const deleteConfirmation = "DELETE ALL HISTORY";

function isLocale(value: string): value is AppLocale {
  return value === "en" || value === "zh";
}

function isWeightUnit(value: string): value is WeightUnitPreference {
  return value === "kg" || value === "lb";
}

function isDistanceUnit(value: string): value is DistanceUnitPreference {
  return value === "km" || value === "mi";
}

export async function updatePreferences(formData: FormData) {
  const locale = formData.get("locale")?.toString() ?? "";
  const weightUnit = formData.get("weight_unit")?.toString() ?? "";
  const distanceUnit = formData.get("distance_unit")?.toString() ?? "";
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  if (isLocale(locale)) cookieStore.set(preferenceCookieNames.locale, locale, options);
  if (isWeightUnit(weightUnit)) cookieStore.set(preferenceCookieNames.weightUnit, weightUnit, options);
  if (isDistanceUnit(distanceUnit)) cookieStore.set(preferenceCookieNames.distanceUnit, distanceUnit, options);

  revalidatePath("/", "layout");
}

export async function deleteAllHistory(
  _previousState: DeleteHistoryState,
  formData: FormData,
): Promise<DeleteHistoryState> {
  const confirmation = formData.get("confirmation")?.toString() ?? "";

  if (confirmation !== deleteConfirmation) {
    return { message: `Type ${deleteConfirmation} exactly before continuing.`, status: "error" };
  }

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { message: "Sign in again before deleting history.", status: "error" };
  }

  const { error } = await supabase.rpc("delete_my_training_history", {
    confirmation_text: deleteConfirmation,
  });

  if (error) {
    return {
      message: "History was not deleted. The protected database function is not available in this preview yet.",
      status: "error",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/workouts");
  revalidatePath("/cardio");
  revalidatePath("/history");
  revalidatePath("/progress");

  return {
    message: "Training history deleted. Your exercise library and settings were kept.",
    status: "success",
  };
}
