import Link from "next/link";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateKey, getLocalDateKey } from "@/lib/training/dates";
import {
  backfillMissingRestDays,
  getDayActivityStatus,
} from "@/lib/training/rest-days";
import { TodayRestDayCard } from "./today-rest-day-card";

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
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  const todayDateKey = getLocalDateKey();
  const backfillResult = userId
    ? await backfillMissingRestDays({
        supabase,
        todayDateKey,
        userId,
      })
    : { insertedDates: [], setupError: undefined };
  const todayStatus = userId
    ? await getDayActivityStatus({
        dateKey: todayDateKey,
        supabase,
        userId,
      })
    : {
        hasCardio: false,
        hasStrength: false,
        restDay: null,
        setupError: "Sign in again before changing Rest Days.",
      };

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Today"
        title="Today's training"
        description="Choose strength, cardio, or mark today as a Rest Day."
      >
        <TodayRestDayCard
          backfilledDates={backfillResult.insertedDates}
          hasCardio={todayStatus.hasCardio}
          hasStrength={todayStatus.hasStrength}
          restDay={todayStatus.restDay}
          setupError={todayStatus.setupError ?? backfillResult.setupError}
          todayLabel={formatDateKey(todayDateKey)}
        />

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
