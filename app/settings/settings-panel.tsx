"use client";

import { useActionState, useState } from "react";
import type { AppPreferences } from "@/lib/preferences-types";
import { deleteAllHistory, updatePreferences, type DeleteHistoryState } from "./actions";

const initialDeleteState: DeleteHistoryState = { message: "", status: "idle" };

export function SettingsPanel({ preferences }: { preferences: AppPreferences }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAllHistory,
    initialDeleteState,
  );
  const zh = preferences.locale === "zh";
  const confirmationMatches = confirmation === "DELETE ALL HISTORY";

  return (
    <div className="grid gap-5">
      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          {zh ? "语言与单位" : "Language and units"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {zh
            ? "偏好保存在当前设备。数据库中的力量训练重量仍统一使用公斤。"
            : "Preferences are saved on this device. Strength data remains stored in kilograms internally."}
        </p>
        <form action={updatePreferences} className="mt-5 grid gap-4 sm:grid-cols-3">
          <label className="grid gap-2 text-sm font-bold">
            <span>{zh ? "界面语言" : "Interface language"}</span>
            <select className="min-h-12 rounded-xl border border-[var(--border)] bg-white px-3" defaultValue={preferences.locale} name="locale">
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            <span>{zh ? "重量显示" : "Weight display"}</span>
            <select className="min-h-12 rounded-xl border border-[var(--border)] bg-white px-3" defaultValue={preferences.weightUnit} name="weight_unit">
              <option value="kg">Kilograms (kg)</option>
              <option value="lb">Pounds (lb)</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            <span>{zh ? "默认距离" : "Default distance"}</span>
            <select className="min-h-12 rounded-xl border border-[var(--border)] bg-white px-3" defaultValue={preferences.distanceUnit} name="distance_unit">
              <option value="km">Kilometres (km)</option>
              <option value="mi">Miles (mi)</option>
            </select>
          </label>
          <button className="min-h-12 rounded-xl bg-[var(--accent)] px-4 font-bold text-white sm:col-span-3" type="submit">
            {zh ? "保存偏好" : "Save preferences"}
          </button>
        </form>
      </section>

      <section className="ui-card p-5 sm:p-6">
        <h2 className="text-xl font-bold text-[var(--foreground)]">
          {zh ? "导出私人数据" : "Export private data"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {zh ? "下载单独的 CSV，或包含全部工作表的 Excel 文件。" : "Download individual CSV files or one Excel workbook with every dataset."}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a className="recovery-secondary min-h-12" href="/settings/export?format=csv&dataset=workouts">{zh ? "训练 CSV" : "Workouts CSV"}</a>
          <a className="recovery-secondary min-h-12" href="/settings/export?format=csv&dataset=cardio">{zh ? "有氧 CSV" : "Cardio CSV"}</a>
          <a className="recovery-secondary min-h-12" href="/settings/export?format=csv&dataset=rest-days">{zh ? "休息日 CSV" : "Rest Days CSV"}</a>
          <a className="recovery-primary min-h-12" href="/settings/export?format=excel">{zh ? "完整 Excel 文件" : "Complete Excel workbook"}</a>
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border-2 border-red-300 bg-red-50/90 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-red-950">{zh ? "危险区域" : "Danger zone"}</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-red-800">
          {zh
            ? "永久删除训练组、训练日期、有氧和休息日记录。动作库、账户和设置会保留。"
            : "Permanently delete sets, workout sessions, cardio entries, and Rest Days. Exercise libraries, your account, and settings are kept."}
        </p>
        <button className="mt-5 min-h-12 rounded-xl bg-red-700 px-5 font-bold text-white" onClick={() => setDeleteOpen(true)} type="button">
          {zh ? "删除所有历史记录" : "Delete all history"}
        </button>
      </section>

      {deleteOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/65 p-3 sm:items-center">
          <section aria-labelledby="delete-history-title" aria-modal="true" className="w-full max-w-xl rounded-[28px] border-4 border-red-600 bg-white p-6 shadow-2xl sm:p-8" role="dialog">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-red-700">{zh ? "不可撤销" : "Cannot be undone"}</p>
            <h2 className="mt-2 text-3xl font-black leading-tight text-red-950" id="delete-history-title">
              {zh ? "这将永久删除你的全部训练历史" : "This permanently deletes your complete training history"}
            </h2>
            <p className="mt-3 font-semibold leading-7 text-red-900">
              {zh ? "训练组、训练日期、有氧和休息日将无法恢复。请先导出备份。" : "Sets, workout dates, cardio records, and Rest Days cannot be recovered. Export a backup first."}
            </p>
            <form action={deleteAction} className="mt-5 space-y-4">
              <label className="grid gap-2 text-sm font-bold">
                <span>{zh ? "输入 DELETE ALL HISTORY 以确认" : "Type DELETE ALL HISTORY to confirm"}</span>
                <input autoComplete="off" className="min-h-12 rounded-xl border-2 border-red-300 px-3 font-bold outline-none focus:border-red-600" name="confirmation" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} />
              </label>
              {deleteState.message ? (
                <p className={deleteState.status === "success" ? "notice notice-success" : "notice notice-error"} role={deleteState.status === "success" ? "status" : "alert"}>{deleteState.message}</p>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <button className="recovery-secondary min-h-12" onClick={() => { setDeleteOpen(false); setConfirmation(""); }} type="button">{zh ? "取消" : "Cancel"}</button>
                <button className="min-h-12 rounded-xl bg-red-700 px-4 font-bold text-white disabled:bg-red-200" disabled={!confirmationMatches || deletePending} type="submit">
                  {deletePending ? (zh ? "正在删除…" : "Deleting…") : zh ? "永久删除历史" : "Permanently delete history"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
