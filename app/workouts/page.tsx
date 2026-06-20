import Link from "next/link";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  await requireAuth("/workouts");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Workouts"
        title="Workout history placeholder"
        description="Recent workout sessions will appear here once the Supabase schema and data flows are implemented."
        actions={
          <Link
            href="/workouts/new"
            className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-5 text-base font-bold text-white"
          >
            Start workout
          </Link>
        }
      >
        <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
          No workout records are loaded in Stage 2.1.
        </div>
      </PlaceholderPage>
    </AppShell>
  );
}
