import { AppShell } from "../../_components/app-shell";
import { PlaceholderPage } from "../../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { NewWorkoutForm } from "./new-workout-form";

export const dynamic = "force-dynamic";

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function NewWorkoutPage() {
  await requireAuth("/workouts/new");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="New Workout"
        title="Start a workout"
        description="Pick the workout date first. Exercises, warmup sets, and working sets are added on the next screen."
      >
        <NewWorkoutForm defaultDate={getTodayDateInputValue()} />
      </PlaceholderPage>
    </AppShell>
  );
}
