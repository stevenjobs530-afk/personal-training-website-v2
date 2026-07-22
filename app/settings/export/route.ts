import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ExportRow = Record<string, null | number | string>;

function escapeCsv(value: null | number | string) {
  const text = value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function rowsToCsv(rows: ExportRow[]) {
  if (!rows.length) return "No records\n";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
  ].join("\n");
}

function escapeXml(value: null | number | string) {
  return (value === null ? "" : String(value))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function worksheet(name: string, rows: ExportRow[]) {
  const headers = rows.length ? Object.keys(rows[0]) : ["No records"];
  const header = `<Row>${headers.map((item) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(item)}</Data></Cell>`).join("")}</Row>`;
  const body = rows.map((row) => `<Row>${headers.map((item) => `<Cell><Data ss:Type="String">${escapeXml(row[item])}</Data></Cell>`).join("")}</Row>`).join("");
  return `<Worksheet ss:Name="${escapeXml(name)}"><Table>${header}${body}</Table></Worksheet>`;
}

function workbook(sheets: Array<{ name: string; rows: ExportRow[] }>) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DCE8FF" ss:Pattern="Solid"/></Style></Styles>
${sheets.map((sheet) => worksheet(sheet.name, sheet.rows)).join("\n")}
</Workbook>`;
}

function download(body: string, contentType: string, filename: string) {
  return new NextResponse(body, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return new NextResponse("Authentication required.", { status: 401 });

  const [exerciseResult, sessionResult, setResult, cardioExerciseResult, cardioResult, restResult] = await Promise.all([
    supabase.from("exercises").select("id, name, notes").order("name"),
    supabase.from("workout_sessions").select("id, workout_date, notes, created_at").order("workout_date"),
    supabase.from("workout_sets").select("id, session_id, exercise_id, set_number, set_kind, weight, reps, notes, created_at").order("created_at"),
    supabase.from("cardio_exercises").select("id, name, category, default_distance_unit, notes").order("name"),
    supabase.from("cardio_entries").select("id, cardio_exercise_id, cardio_date, duration_seconds, distance_value, distance_unit, calories, notes, created_at").order("cardio_date"),
    supabase.from("rest_days").select("id, rest_date, notes, created_at").order("rest_date"),
  ]);

  if ([exerciseResult.error, sessionResult.error, setResult.error, cardioExerciseResult.error, cardioResult.error, restResult.error].some(Boolean)) {
    return new NextResponse("Export could not be prepared.", { status: 500 });
  }

  const exercises = exerciseResult.data ?? [];
  const sessions = sessionResult.data ?? [];
  const cardioExercises = cardioExerciseResult.data ?? [];
  const sessionById = new Map(sessions.map((item) => [item.id, item]));
  const exerciseById = new Map(exercises.map((item) => [item.id, item]));
  const cardioExerciseById = new Map(cardioExercises.map((item) => [item.id, item]));
  const workouts: ExportRow[] = (setResult.data ?? []).map((set) => ({
    workout_date: sessionById.get(set.session_id)?.workout_date ?? "",
    exercise: exerciseById.get(set.exercise_id)?.name ?? "",
    set_number: set.set_number,
    set_kind: set.set_kind,
    weight_kg: set.weight,
    reps: set.reps,
    set_notes: set.notes,
    session_notes: sessionById.get(set.session_id)?.notes ?? null,
    created_at: set.created_at,
  }));
  const cardio: ExportRow[] = (cardioResult.data ?? []).map((entry) => ({
    cardio_date: entry.cardio_date,
    exercise: cardioExerciseById.get(entry.cardio_exercise_id)?.name ?? "",
    category: cardioExerciseById.get(entry.cardio_exercise_id)?.category ?? "",
    duration_seconds: entry.duration_seconds,
    distance_value: entry.distance_value,
    distance_unit: entry.distance_unit,
    calories: entry.calories,
    notes: entry.notes,
    created_at: entry.created_at,
  }));
  const restDays: ExportRow[] = (restResult.data ?? []).map((item) => ({ rest_date: item.rest_date, notes: item.notes, created_at: item.created_at }));
  const libraries: ExportRow[] = [
    ...exercises.map((item) => ({ type: "strength", name: item.name, category: "", default_distance_unit: "", notes: item.notes })),
    ...cardioExercises.map((item) => ({ type: "cardio", name: item.name, category: item.category, default_distance_unit: item.default_distance_unit, notes: item.notes })),
  ];
  const date = new Date().toISOString().slice(0, 10);

  if (request.nextUrl.searchParams.get("format") === "excel") {
    return download(workbook([
      { name: "Workout Sets", rows: workouts },
      { name: "Cardio", rows: cardio },
      { name: "Rest Days", rows: restDays },
      { name: "Exercises", rows: libraries },
    ]), "application/vnd.ms-excel; charset=utf-8", `personal-training-${date}.xls`);
  }

  const dataset = request.nextUrl.searchParams.get("dataset");
  const rows = dataset === "cardio" ? cardio : dataset === "rest-days" ? restDays : workouts;
  const safeDataset = dataset === "cardio" || dataset === "rest-days" ? dataset : "workouts";
  return download(`\uFEFF${rowsToCsv(rows)}`, "text/csv; charset=utf-8", `personal-training-${safeDataset}-${date}.csv`);
}
