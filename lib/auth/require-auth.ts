import { redirect } from "next/navigation";
import { getLoginRedirectUrl } from "./routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function redirectToLogin(currentPath: string): never {
  const loginUrl = getLoginRedirectUrl(new URL(currentPath, "http://app.local"));

  redirect(`${loginUrl.pathname}${loginUrl.search}`);
}

export async function requireAuth(currentPath: string) {
  if (!hasSupabaseEnv()) {
    redirectToLogin(currentPath);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirectToLogin(currentPath);
  }

  return data.claims;
}
