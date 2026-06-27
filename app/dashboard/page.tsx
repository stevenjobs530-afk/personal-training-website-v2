import Link from "next/link";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

const trainingChoices = [
  {
    href: "/workouts/new",
    label: "Strength Training",
    description: "Weights, machines, warmup sets, working sets, reps.",
    cta: "Start strength",
  },
  {
    href: "/cardio/new",
    label: "Cardio",
    description: "Walking and running with distance, cycling and elliptical by kcal.",
    cta: "Record cardio",
  },
];

export default async function DashboardPage() {
  await requireAuth("/dashboard");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Dashboard"
        title="Choose workout type"
        description="Pick the training type manually. Strength and Cardio stay separate so each workout is logged in the right format."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {trainingChoices.map((choice) => (
            <Link
              className="flex min-h-40 flex-col justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm hover:border-[var(--accent)]"
              href={choice.href}
              key={choice.href}
            >
              <div className="space-y-2">
                <h2 className="text-xl font-black text-[var(--foreground)]">
                  {choice.label}
                </h2>
                <p className="text-sm leading-6 text-[var(--muted)]">
                  {choice.description}
                </p>
              </div>
              <span className="mt-4 inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-sm font-bold text-white">
                {choice.cta}
              </span>
            </Link>
          ))}
        </div>
      </PlaceholderPage>
    </AppShell>
  );
}
