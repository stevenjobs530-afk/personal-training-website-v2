const reservedCardioExerciseNames = [
  "Indoor Walking",
  "Outdoor Walking",
  "Indoor Running",
  "Outdoor Running",
  "Indoor Cycling",
  "Elliptical",
] as const;

function normalizeExerciseName(name: string) {
  return name.trim().replace(/[.\s]+$/g, "").toLowerCase();
}

const reservedCardioExerciseNameSet = new Set(
  reservedCardioExerciseNames.map(normalizeExerciseName),
);

export function isReservedCardioExerciseName(name: string) {
  return reservedCardioExerciseNameSet.has(normalizeExerciseName(name));
}

export function filterStrengthExercises<T extends { name: string }>(exercises: T[]) {
  return exercises.filter((exercise) => !isReservedCardioExerciseName(exercise.name));
}

export function getReservedStrengthExercises<T extends { name: string }>(
  exercises: T[],
) {
  return exercises.filter((exercise) => isReservedCardioExerciseName(exercise.name));
}
