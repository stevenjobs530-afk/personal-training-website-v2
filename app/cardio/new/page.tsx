import { AppShell } from "../../_components/app-shell";
import { PlaceholderPage } from "../../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { NewCardioForm, type CardioExerciseOption } from "./new-cardio-form";

export const dynamic = "force-dynamic";

type CardioExerciseRow = {
  id: string;
  name: string;
  category: string;
  default_distance_unit: "km" | "mi";
};

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function NewCardioPage() {
  await requireAuth("/cardio/new");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cardio_exercises")
    .select("id, name, category, default_distance_unit")
    .order("name", { ascending: true });
  const exercises = ((data ?? []) as CardioExerciseRow[]).map<CardioExerciseOption>(
    (exercise) => ({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      defaultDistanceUnit: exercise.default_distance_unit,
    }),
  );

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="New Cardio"
        title="Record cardio"
        description="Save aerobic work by kcal, with distance for walking and running."
      >
        {error ? (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800"
            role="alert"
          >
            Cardio exercises are not available yet. Apply the cardio Supabase
            setup, then refresh this page.
          </div>
        ) : null}
        <NewCardioForm
          defaultDate={getTodayDateInputValue()}
          exercises={exercises}
        />
      </PlaceholderPage>
    </AppShell>
  );
}
