import Link from "next/link";
import { SignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { signOut } from "../auth/actions";
import { getCopy } from "@/lib/i18n";
import { getAppPreferences } from "@/lib/preferences";
import { MobileNavigation } from "./mobile-navigation";
import { TopNavigation } from "./top-navigation";

type AppShellProps = {
  children: React.ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const { locale } = await getAppPreferences();
  const text = getCopy(locale);
  const navItems = [
    { href: "/dashboard", label: text.today },
    { href: "/workouts", label: text.workouts },
    { href: "/cardio", label: text.cardio },
    { href: "/history", label: text.history },
    { href: "/exercises", label: text.exercises },
    { href: "/progress", label: text.progress },
    { href: "/settings", label: text.settings },
  ];
  return (
    <div className="site-backdrop">
      <div className="app-window">
        <header className="app-header">
          <Link href="/dashboard" className="app-brand">
            <span className="app-brand-kicker">{text.privateLog}</span>
            <span className="app-brand-title">{text.personalTraining}</span>
          </Link>
          <form action={signOut}>
            <button aria-label={text.signOut} className="app-header-action" type="submit">
              <span>{text.signOut}</span>
              <SignOutIcon aria-hidden="true" size={18} weight="bold" />
            </button>
          </form>
        </header>

        <TopNavigation items={navItems} />

        <main className="app-workspace" data-app-workspace>
          {children}
        </main>
      </div>
      <MobileNavigation
        labels={{
          exercises: text.exercises,
          more: text.more,
          progress: text.progress,
          today: text.today,
          workouts: text.workouts,
        }}
        moreItems={[
          { href: "/cardio", label: text.cardio },
          { href: "/history", label: text.history },
          { href: "/settings", label: text.settings },
        ]}
      />
    </div>
  );
}
