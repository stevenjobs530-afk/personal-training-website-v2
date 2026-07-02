export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKeyAsUtcDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function toUtcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDaysToDateKey(dateKey: string, days: number) {
  const date = parseDateKeyAsUtcDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);

  return toUtcDateKey(date);
}

export function getDateKeysBetweenExclusive(startDateKey: string, endDateKey: string) {
  const dateKeys: string[] = [];
  let cursor = addDaysToDateKey(startDateKey, 1);

  while (cursor < endDateKey) {
    dateKeys.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }

  return dateKeys;
}

export function formatDateKey(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(parseDateKeyAsUtcDate(value));
}
