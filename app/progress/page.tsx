import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  await requireAuth("/progress");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Progress"
        title="Progress analysis comes later"
        description="Version 1 records clean workout data first. Charts, trends, and deeper analysis stay out of scope until the logging flow is stable."
      >
        <div className="rounded-md border border-[var(--border)] bg-[var(--accent-soft)] p-5 text-base leading-7 text-[var(--accent-strong)]">
          This page is a placeholder for future derived insights from workout
          sets and sessions.
        </div>
      </PlaceholderPage>
    </AppShell>
  );
}
