import { AppShell } from "../../_components/app-shell";
import { PlaceholderPage } from "../../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

const plannedFields = ["Exercise", "Warmup or working set", "Weight", "Reps"];

export default async function NewWorkoutPage() {
  await requireAuth("/workouts/new");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="New Workout"
        title="Fast set entry placeholder"
        description="The future workout entry flow should stay fast on iPhone with large controls and minimal typing."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {plannedFields.map((field) => (
            <div
              key={field}
              className="flex min-h-16 items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 text-base font-semibold text-[var(--foreground)]"
            >
              {field}
            </div>
          ))}
        </div>
      </PlaceholderPage>
    </AppShell>
  );
}
