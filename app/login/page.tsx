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
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <section className="w-full max-w-sm space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Private Access
          </p>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Login</h1>
          <p className="text-base leading-7 text-[var(--muted)]">
            Sign in with the private Supabase email and app password. Public
            signup is intentionally not part of Version 1.
          </p>
        </div>

        <LoginForm isConfigured={isConfigured} nextPath={nextPath} />
      </section>
    </main>
  );
}
