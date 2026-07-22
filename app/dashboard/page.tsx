import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BarbellIcon } from "@phosphor-icons/react/dist/ssr/Barbell";
import { HeartbeatIcon } from "@phosphor-icons/react/dist/ssr/Heartbeat";
import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { getAppPreferences } from "@/lib/preferences";
import { formatDateKey, getLocalDateKey } from "@/lib/training/dates";
import {
  backfillMissingRestDays,
  getDayActivityStatus,
} from "@/lib/training/rest-days";
import { TodayRestDayCard } from "./today-rest-day-card";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireAuth("/dashboard");
  const preferences = await getAppPreferences();
  const zh = preferences.locale === "zh";
  const trainingChoices = [
    {
      href: "/workouts/new",
      label: zh ? "力量训练" : "Strength Training",
      description: zh ? "重量、器械、热身组、工作组和次数。" : "Weights, machines, warmup sets, working sets, reps.",
      cta: zh ? "开始力量训练" : "Start strength",
      tone: "strength",
    },
    {
      href: "/cardio/new",
      label: zh ? "有氧训练" : "Cardio",
      description: zh ? "步行和跑步记录距离，骑行和椭圆机记录热量。" : "Walking and running with distance, cycling and elliptical by kcal.",
      cta: zh ? "记录有氧" : "Record cardio",
      tone: "cardio",
    },
  ];
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
        eyebrow={zh ? "今天" : "Today"}
        title={zh ? "今天的训练" : "Today's training"}
        description={zh ? "选择力量训练、有氧训练，或将今天标记为休息日。" : "Choose strength, cardio, or mark today as a Rest Day."}
      >
        <TodayRestDayCard
          backfilledDates={backfillResult.insertedDates}
          hasCardio={todayStatus.hasCardio}
          hasStrength={todayStatus.hasStrength}
          locale={preferences.locale}
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
