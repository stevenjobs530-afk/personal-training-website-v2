import type { AppLocale } from "./preferences-types";

export const copy = {
  en: {
    cardio: "Cardio",
    exercises: "Exercises",
    history: "History",
    more: "More",
    personalTraining: "Personal Training",
    privateLog: "Private training log",
    progress: "Progress",
    settings: "Settings",
    signOut: "Sign out",
    today: "Today",
    workouts: "Workouts",
  },
  zh: {
    cardio: "有氧",
    exercises: "动作库",
    history: "历史",
    more: "更多",
    personalTraining: "个人训练",
    privateLog: "私人训练记录",
    progress: "进度",
    settings: "设置",
    signOut: "退出登录",
    today: "今天",
    workouts: "训练",
  },
} as const;

export function getCopy(locale: AppLocale) {
  return copy[locale];
}
