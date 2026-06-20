"use server";

import { redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/auth/routes";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type LoginFormState = {
  error: string;
};

export async function login(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const nextPath = getSafeNextPath(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  if (!hasSupabaseEnv()) {
    return { error: "Supabase is not configured for this environment yet." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Email or password is incorrect." };
  }

  redirect(nextPath);
}
