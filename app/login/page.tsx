import { redirect } from "next/navigation";
import { getSafeNextPath, dashboardPath } from "@/lib/auth/routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(
    Array.isArray(params.next) ? params.next[0] : params.next,
  );
  const isConfigured = hasSupabaseEnv();

  if (isConfigured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    if (data?.claims) {
      redirect(dashboardPath);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-grid">
        <div className="login-copy">
          <p className="login-copy-kicker">Private training workspace</p>
          <div>
            <h1>Personal Training.</h1>
            <p>
              A focused place to record strength, cardio and recovery across
              the gym you actually use.
            </p>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-panel-inner">
            <header className="login-panel-heading">
              <h2>Welcome back</h2>
              <p>
                Sign in to the private owner account. Public signup is not
                available.
              </p>
            </header>
            <LoginForm isConfigured={isConfigured} nextPath={nextPath} />
          </div>
        </div>
      </section>
    </main>
  );
}
