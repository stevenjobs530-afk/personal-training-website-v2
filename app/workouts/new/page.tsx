import { AppShell } from "../../_components/app-shell";
import { PlaceholderPage } from "../../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { getLocalDateKey } from "@/lib/training/dates";
import { NewWorkoutForm } from "./new-workout-form";

export const dynamic = "force-dynamic";

export default async function NewWorkoutPage() {
  await requireAuth("/workouts/new");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="New Workout"
        title="Start a workout"
        description="Pick the workout date first. Exercises, warmup sets, and working sets are added on the next screen."
      >
        <NewWorkoutForm defaultDate={getLocalDateKey()} />
      </PlaceholderPage>
    </AppShell>
  );
}
