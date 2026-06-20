import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export default async function ExercisesPage() {
  await requireAuth("/exercises");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Exercises"
        title="Exercise list placeholder"
        description="User-owned exercise and machine names will be managed here after Supabase tables and Row Level Security are added."
      >
        <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)] p-5 text-base leading-7 text-[var(--muted)]">
          Exercise creation is intentionally not implemented in Stage 2.1.
        </div>
      </PlaceholderPage>
    </AppShell>
  );
}
