import { getDateKeysBetweenExclusive } from "./dates";
import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type DateColumn = "workout_date" | "cardio_date" | "rest_date";

type DatabaseError = {
  code?: string;
  message?: string;
};

export type RestDayRow = {
  id: string;
  rest_date: string;
  notes: string | null;
};

export type DayActivityStatus = {
  hasCardio: boolean;
  hasStrength: boolean;
  restDay: RestDayRow | null;
  setupError?: string;
};

export type RestDayMutationResult = {
  status: "success" | "error";
  message: string;
};

export type RestDayBackfillResult = {
  insertedDates: string[];
  setupError?: string;
};

const setupErrorMessage =
  "Rest Day storage is not available yet. Apply the local rest_days migration in Supabase, then refresh.";

function toSetupError(error: DatabaseError | null) {
  return error ? setupErrorMessage : undefined;
}

async function getRowsForDate(
  supabase: SupabaseClient,
  table: "workout_sessions" | "cardio_entries",
  dateColumn: DateColumn,
  userId: string,
  dateKey: string,
) {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("user_id", userId)
    .eq(dateColumn, dateKey)
    .limit(1);

  return {
    count: data?.length ?? 0,
    error,
  };
}

async function getRestDayForDate(
  supabase: SupabaseClient,
  userId: string,
  dateKey: string,
) {
  const { data, error } = await supabase
    .from("rest_days")
    .select("id, rest_date, notes")
    .eq("user_id", userId)
    .eq("rest_date", dateKey)
    .maybeSingle();

  return {
    data: (data ?? null) as RestDayRow | null,
    error,
  };
}

export async function getDayActivityStatus({
  dateKey,
  supabase,
  userId,
}: {
  dateKey: string;
  supabase: SupabaseClient;
  userId: string;
}): Promise<DayActivityStatus> {
  const [strengthResult, cardioResult, restResult] = await Promise.all([
    getRowsForDate(supabase, "workout_sessions", "workout_date", userId, dateKey),
    getRowsForDate(supabase, "cardio_entries", "cardio_date", userId, dateKey),
    getRestDayForDate(supabase, userId, dateKey),
  ]);
  const setupError =
    toSetupError(strengthResult.error) ??
    toSetupError(cardioResult.error) ??
    toSetupError(restResult.error);

  return {
    hasCardio: cardioResult.count > 0,
    hasStrength: strengthResult.count > 0,
    restDay: restResult.data,
    setupError,
  };
}

async function getDateSet({
  dateColumn,
  dateKeys,
  supabase,
  table,
  userId,
}: {
  dateColumn: DateColumn;
  dateKeys: string[];
  supabase: SupabaseClient;
  table: "workout_sessions" | "cardio_entries" | "rest_days";
  userId: string;
}) {
  if (!dateKeys.length) {
    return {
      dates: new Set<string>(),
      error: null,
    };
  }

  const { data, error } = await supabase
    .from(table)
    .select(dateColumn)
    .eq("user_id", userId)
    .in(dateColumn, dateKeys);

  return {
    dates: new Set(
      ((data ?? []) as Record<string, string>[]).map((row) => row[dateColumn]),
    ),
    error,
  };
}

async function getLastSeenDate({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("profiles")
    .select("last_seen_date")
    .eq("id", userId)
    .maybeSingle();

  return {
    dateKey: data
      ? String((data as { last_seen_date: string | null }).last_seen_date ?? "")
      : null,
    error,
  };
}

async function setLastSeenDate({
  supabase,
  todayDateKey,
  userId,
}: {
  supabase: SupabaseClient;
  todayDateKey: string;
  userId: string;
}) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      last_seen_date: todayDateKey,
    },
    {
      onConflict: "id",
    },
  );

  return error;
}

export function getBlankDateKeys({
  cardioDateKeys,
  candidateDateKeys,
  restDateKeys,
  strengthDateKeys,
}: {
  cardioDateKeys: Set<string>;
  candidateDateKeys: string[];
  restDateKeys: Set<string>;
  strengthDateKeys: Set<string>;
}) {
  return candidateDateKeys.filter(
    (dateKey) =>
      !strengthDateKeys.has(dateKey) &&
      !cardioDateKeys.has(dateKey) &&
      !restDateKeys.has(dateKey),
  );
}

export async function backfillMissingRestDays({
  supabase,
  todayDateKey,
  userId,
}: {
  supabase: SupabaseClient;
  todayDateKey: string;
  userId: string;
}): Promise<RestDayBackfillResult> {
  const lastSeenResult = await getLastSeenDate({ supabase, userId });

  if (lastSeenResult.error) {
    return {
      insertedDates: [],
      setupError: setupErrorMessage,
    };
  }

  const lastSeenDateKey = lastSeenResult.dateKey;

  if (!lastSeenDateKey) {
    const updateError = await setLastSeenDate({
      supabase,
      todayDateKey,
      userId,
    });

    return {
      insertedDates: [],
      setupError: toSetupError(updateError),
    };
  }

  if (lastSeenDateKey >= todayDateKey) {
    return {
      insertedDates: [],
    };
  }

  const candidateDateKeys = getDateKeysBetweenExclusive(
    lastSeenDateKey,
    todayDateKey,
  );

  if (!candidateDateKeys.length) {
    const updateError = await setLastSeenDate({
      supabase,
      todayDateKey,
      userId,
    });

    return {
      insertedDates: [],
      setupError: toSetupError(updateError),
    };
  }

  const [strengthDates, cardioDates, restDates] = await Promise.all([
    getDateSet({
      dateColumn: "workout_date",
      dateKeys: candidateDateKeys,
      supabase,
      table: "workout_sessions",
      userId,
    }),
    getDateSet({
      dateColumn: "cardio_date",
      dateKeys: candidateDateKeys,
      supabase,
      table: "cardio_entries",
      userId,
    }),
    getDateSet({
      dateColumn: "rest_date",
      dateKeys: candidateDateKeys,
      supabase,
      table: "rest_days",
      userId,
    }),
  ]);
  const dateSetError = [strengthDates.error, cardioDates.error, restDates.error]
    .map(toSetupError)
    .find(Boolean);

  if (dateSetError) {
    return {
      insertedDates: [],
      setupError: dateSetError,
    };
  }

  const blankDateKeys = getBlankDateKeys({
    cardioDateKeys: cardioDates.dates,
    candidateDateKeys,
    restDateKeys: restDates.dates,
    strengthDateKeys: strengthDates.dates,
  });

  if (!blankDateKeys.length) {
    const updateError = await setLastSeenDate({
      supabase,
      todayDateKey,
      userId,
    });

    return {
      insertedDates: [],
      setupError: toSetupError(updateError),
    };
  }

  const { error } = await supabase.from("rest_days").insert(
    blankDateKeys.map((dateKey) => ({
      user_id: userId,
      rest_date: dateKey,
      notes: null,
    })),
  );

  if (error) {
    return {
      insertedDates: [],
      setupError: setupErrorMessage,
    };
  }

  const updateError = await setLastSeenDate({
    supabase,
    todayDateKey,
    userId,
  });

  if (updateError) {
    return {
      insertedDates: blankDateKeys,
      setupError: setupErrorMessage,
    };
  }

  return {
    insertedDates: blankDateKeys,
  };
}

export async function markRestDayForDate({
  dateKey,
  supabase,
  userId,
}: {
  dateKey: string;
  supabase: SupabaseClient;
  userId: string;
}): Promise<RestDayMutationResult> {
  const status = await getDayActivityStatus({ dateKey, supabase, userId });

  if (status.setupError) {
    return {
      status: "error",
      message: status.setupError,
    };
  }

  if (status.hasStrength || status.hasCardio) {
    return {
      status: "error",
      message:
        "This date already has training recorded. Remove or correct that entry before marking it as Rest Day.",
    };
  }

  if (status.restDay) {
    return {
      status: "success",
      message: "This date is already logged as Rest Day.",
    };
  }

  const { error } = await supabase.from("rest_days").insert({
    user_id: userId,
    rest_date: dateKey,
    notes: null,
  });

  if (error?.code === "23505") {
    return {
      status: "success",
      message: "This date is already logged as Rest Day.",
    };
  }

  if (error?.code === "23514") {
    return {
      status: "error",
      message:
        "This date already has training recorded. Remove or correct that entry before marking it as Rest Day.",
    };
  }

  if (error) {
    return {
      status: "error",
      message: setupErrorMessage,
    };
  }

  return {
    status: "success",
    message: "Rest Day logged.",
  };
}

export async function deleteRestDayById({
  restDayId,
  supabase,
  userId,
}: {
  restDayId: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  await supabase
    .from("rest_days")
    .delete()
    .eq("id", restDayId)
    .eq("user_id", userId);
}
