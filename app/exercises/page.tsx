import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { ExerciseManager, type ExerciseListItem } from "./exercise-manager";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  await requireAuth("/exercises");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, notes")
    .order("name", { ascending: true });

  const exercises: ExerciseListItem[] = data ?? [];

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Exercises"
        title="Exercise library"
        description="Scan saved machines and movements quickly. Open Manage only when you need to edit."
      >
        {error ? (
          <div
            className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"
            role="alert"
          >
            Exercises could not be loaded. Try refreshing the page.
          </div>
        ) : null}
        <ExerciseManager exercises={exercises} />
      </PlaceholderPage>
    </AppShell>
  );
}
