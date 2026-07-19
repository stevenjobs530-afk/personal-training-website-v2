import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
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
    tone: "strength",
  },
  {
    href: "/cardio/new",
    label: "Cardio",
    description: "Walking and running with distance, cycling and elliptical by kcal.",
    cta: "Record cardio",
    tone: "cardio",
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
        >
          {trainingChoices.map((choice) => (
            <Link
              className="training-choice-card"
              data-tone={choice.tone}
              href={choice.href}
              key={choice.href}
            >
              <div className="training-card-copy">
                <span className="training-card-icon">
                  {choice.tone === "cardio" ? (
                    <HeartbeatIcon aria-hidden="true" size={28} weight="bold" />
                  ) : (
                    <BarbellIcon aria-hidden="true" size={28} weight="bold" />
                  )}
                </span>
                <h2>{choice.label}</h2>
                <p>{choice.description}</p>
              </div>
              <span className="training-card-link">
                <span>{choice.cta}</span>
                <ArrowRightIcon aria-hidden="true" size={20} weight="bold" />
              </span>
            </Link>
          ))}
        </TodayRestDayCard>
      </PlaceholderPage>
    </AppShell>
  );
}
