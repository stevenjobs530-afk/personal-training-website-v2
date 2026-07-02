"use server";

import { revalidatePath } from "next/cache";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { getLocalDateKey } from "@/lib/training/dates";
import {
  deleteRestDayById,
  markRestDayForDate,
  type RestDayMutationResult,
} from "@/lib/training/rest-days";

export type RestDayActionState = {
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
      state: RestDayActionState;
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
        message: "Sign in again before changing Rest Days.",
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

function isDateInputValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toActionState(result: RestDayMutationResult): RestDayActionState {
  return {
    status: result.status,
    message: result.message,
  };
}

function revalidateRestDaySurfaces() {
  revalidatePath("/dashboard");
  revalidatePath("/workouts");
  revalidatePath("/workouts/new");
  revalidatePath("/history");
}

export async function logTodayRestDay(
  _previousState: RestDayActionState,
  _formData: FormData,
): Promise<RestDayActionState> {
  void _previousState;
  void _formData;

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const todayDateKey = getLocalDateKey();
  const result = await markRestDayForDate({
    dateKey: todayDateKey,
    supabase: context.supabase,
    userId: context.userId,
  });

  revalidateRestDaySurfaces();

  return toActionState(result);
}

export async function logSelectedRestDay(
  _previousState: RestDayActionState,
  formData: FormData,
): Promise<RestDayActionState> {
  const restDate =
    getTrimmedValue(formData, "rest_date") ||
    getTrimmedValue(formData, "workout_date");

  if (!isDateInputValue(restDate)) {
    return {
      status: "error",
      message: "Enter a valid Rest Day date.",
    };
  }

  const context = await getActionContext();

  if (!context.ok) {
    return context.state;
  }

  const result = await markRestDayForDate({
    dateKey: restDate,
    supabase: context.supabase,
    userId: context.userId,
  });

  revalidateRestDaySurfaces();

  return toActionState(result);
}

export async function removeRestDay(formData: FormData): Promise<void> {
  const restDayId = getTrimmedValue(formData, "rest_day_id");

  if (!restDayId) {
    return;
  }

  const context = await getActionContext();

  if (!context.ok) {
    return;
  }

  await deleteRestDayById({
    restDayId,
    supabase: context.supabase,
    userId: context.userId,
  });

  revalidateRestDaySurfaces();
}
