export type AppLocale = "en" | "zh";
export type DistanceUnitPreference = "km" | "mi";
export type WeightUnitPreference = "kg" | "lb";

export type AppPreferences = {
  distanceUnit: DistanceUnitPreference;
  locale: AppLocale;
  weightUnit: WeightUnitPreference;
};
