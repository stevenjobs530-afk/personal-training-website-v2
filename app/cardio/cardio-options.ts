export const cardioCategories = [
  "indoor_walking",
  "outdoor_walking",
  "indoor_running",
  "outdoor_running",
  "cycling",
  "elliptical",
] as const;

export const distanceUnits = ["km", "mi"] as const;

export type CardioCategory = (typeof cardioCategories)[number];
export type DistanceUnit = (typeof distanceUnits)[number];

export const cardioCategoryLabels: Record<CardioCategory, string> = {
  indoor_walking: "Indoor Walking",
  outdoor_walking: "Outdoor Walking",
  indoor_running: "Indoor Running",
  outdoor_running: "Outdoor Running",
  cycling: "Indoor Cycling",
  elliptical: "Elliptical",
};

const distanceRequiredCategories = new Set<string>([
  "indoor_walking",
  "outdoor_walking",
  "indoor_running",
  "outdoor_running",
]);

export function needsCardioDistance(category: string) {
  return distanceRequiredCategories.has(category);
}
