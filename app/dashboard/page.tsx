import Link from "next/link";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

const summaryItems = [
  { label: "Workout entry", value: "Next stage" },
  { label: "Recent history", value: "Not built yet" },
  { label: "Auth guard", value: "Active" },
];

export default async function DashboardPage() {
  await requireAuth("/dashboard");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Dashboard"
        title="Today placeholder"
        description="This route is ready for the protected app shell. Supabase authentication and real workout data will be added in later Stage 2 steps."
        actions={
          <Link
            href="/workouts/new"
            className="inline-flex min-h-12 items-center rounded-md bg-[var(--accent)] px-5 text-base font-bold text-white"
          >
            New workout
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <p className="text-sm font-semibold text-[var(--muted)]">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-bold text-[var(--foreground)]">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </PlaceholderPage>
    </AppShell>
  );
}
