import Link from "next/link";
import { signOut } from "../auth/actions";

const navItems = [
  { href: "/dashboard", label: "Today" },
  { href: "/workouts", label: "Workouts" },
  { href: "/cardio", label: "Cardio" },
  { href: "/exercises", label: "Exercises" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <nav className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto grid min-h-9 w-full max-w-5xl grid-cols-6 px-1 sm:px-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-center rounded-md px-1 text-center text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)] sm:px-3 sm:text-sm"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="flex min-h-11 flex-col justify-center">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Private Log
            </span>
            <span className="text-lg font-bold text-[var(--foreground)]">
              Personal Training
            </span>
          </Link>
          <form action={signOut}>
            <button
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--border)] bg-transparent px-4 text-sm font-semibold text-[var(--foreground)]"
              type="submit"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
