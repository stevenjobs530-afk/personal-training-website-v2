import "server-only";

import { cookies } from "next/headers";
import type { AppPreferences } from "./preferences-types";

export type {
  AppLocale,
  AppPreferences,
  DistanceUnitPreference,
  WeightUnitPreference,
} from "./preferences-types";

export const preferenceCookieNames = {
  distanceUnit: "pt_distance_unit",
  locale: "pt_locale",
  weightUnit: "pt_weight_unit",
} as const;

export async function getAppPreferences(): Promise<AppPreferences> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(preferenceCookieNames.locale)?.value;
  const weightUnit = cookieStore.get(preferenceCookieNames.weightUnit)?.value;
  const distanceUnit = cookieStore.get(preferenceCookieNames.distanceUnit)?.value;

  return {
    distanceUnit: distanceUnit === "mi" ? "mi" : "km",
    locale: locale === "zh" ? "zh" : "en",
    weightUnit: weightUnit === "lb" ? "lb" : "kg",
  };
}
