"use client";

import { useActionState } from "react";
import { login, type LoginFormState } from "./actions";

const initialState: LoginFormState = {
  error: "",
};

type LoginFormProps = {
  isConfigured: boolean;
  nextPath: string;
};

export function LoginForm({ isConfigured, nextPath }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(login, initialState);
  const isDisabled = pending || !isConfigured;

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <input name="next" type="hidden" value={nextPath} />

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Email
        </span>
        <input
          className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          type="email"
          name="email"
          autoComplete="username"
          placeholder="you@example.com"
          required
          disabled={isDisabled}
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-semibold text-[var(--foreground)]">
          Password
        </span>
        <input
          className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          required
          disabled={isDisabled}
        />
      </label>

      {state.error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}

      {!isConfigured ? (
        <p className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--muted)]">
          Supabase environment variables are not configured locally yet.
        </p>
      ) : null}

      <button
        className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
        type="submit"
        disabled={isDisabled}
      >
        {pending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
