"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { removeRestDay, undoRemoveRestDay, type RestDayActionState } from "@/app/_actions/rest-days";

const initialState: RestDayActionState = { status: "idle", message: "" };

export function RestDayRemoval({ compact = false, label = "Remove Rest Day", restDayId }: { compact?: boolean; label?: string; restDayId: string }) {
  const router = useRouter();
  const [removeState, removeAction, removing] = useActionState(removeRestDay, initialState);
  const [undoState, undoAction, undoing] = useActionState(undoRemoveRestDay, initialState);

  useEffect(() => {
    if (removeState.status !== "success" || !removeState.removedRestDate) return;
    const timer = window.setTimeout(() => router.refresh(), 8000);
    return () => window.clearTimeout(timer);
  }, [removeState, router]);

  if (removeState.status === "success" && removeState.removedRestDate) {
    return (
      <div className="notice notice-success flex flex-wrap items-center gap-2" role="status">
        <span>{undoState.message || removeState.message}</span>
        {undoState.status !== "success" ? (
          <form action={undoAction}>
            <input name="rest_date" type="hidden" value={removeState.removedRestDate} />
            <input name="rest_notes" type="hidden" value={removeState.removedRestNotes ?? ""} />
            <button className="font-bold underline" disabled={undoing} type="submit">{undoing ? "Restoring…" : "Undo"}</button>
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <form action={removeAction}>
      <input name="rest_day_id" type="hidden" value={restDayId} />
      <button className={compact ? "recovery-secondary min-h-10" : "recovery-secondary"} disabled={removing} type="submit">
        {removing ? "Removing…" : label}
      </button>
      {removeState.status === "error" ? <p className="mt-2 text-sm font-semibold text-red-700" role="alert">{removeState.message}</p> : null}
    </form>
  );
}
