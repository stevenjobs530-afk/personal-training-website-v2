import Link from "next/link";
import { signOut } from "../auth/actions";
import { PreviewFrame, TopNavigation } from "./preview-frame";

const navItems = [
  { href: "/dashboard", label: "Today" },
  { href: "/workouts", label: "Workouts" },
  { href: "/cardio", label: "Cardio" },
  { href: "/history", label: "History" },
  { href: "/exercises", label: "Exercises" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] px-3 py-4 sm:px-5">
      <PreviewFrame>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <header className="border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between gap-4 px-4 py-5 sm:px-6">
              <Link
                href="/dashboard"
                className="flex min-h-11 min-w-0 flex-col justify-center"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Private Log
                </span>
                <span className="truncate text-xl font-bold text-[var(--foreground)]">
                  Personal Training
                </span>
              </Link>
              <form action={signOut}>
                <button
                  className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-[var(--border)] bg-transparent px-4 text-sm font-semibold text-[var(--foreground)]"
                  type="submit"
                >
                  Sign out
                </button>
              </form>
            </div>
          </header>

          <TopNavigation items={navItems} />

          <main className="bg-[var(--background)] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </PreviewFrame>
    </div>
  );
}
