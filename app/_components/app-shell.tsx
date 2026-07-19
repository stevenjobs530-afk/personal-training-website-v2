import Link from "next/link";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { signOut } from "../auth/actions";
import { TopNavigation } from "./top-navigation";

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
    <div className="site-backdrop">
      <div className="app-window">
        <header className="app-header">
          <Link href="/dashboard" className="app-brand">
            <span className="app-brand-kicker">Private training log</span>
            <span className="app-brand-title">Personal Training</span>
          </Link>
          <form action={signOut}>
            <button className="app-header-action" type="submit">
              <span>Sign out</span>
              <SignOutIcon aria-hidden="true" size={18} weight="bold" />
            </button>
          </form>
        </header>

        <TopNavigation items={navItems} />

        <main className="app-workspace" data-app-workspace>
          {children}
        </main>
      </div>
    </div>
  );
}
