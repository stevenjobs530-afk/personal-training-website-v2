"use client";

import { FormEvent, useActionState, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
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
  const [isRecovery, setIsRecovery] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const isDisabled = pending || !isConfigured;

  useEffect(() => {
    if (!isConfigured) {
      return;
    }

    const recoveryParams = new URLSearchParams(window.location.hash.slice(1));

    if (recoveryParams.get("type") !== "recovery") {
      return;
    }

    const accessToken = recoveryParams.get("access_token");
    const refreshToken = recoveryParams.get("refresh_token");
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    const supabase = createClient();
    let isActive = true;

    window.history.replaceState(null, "", cleanUrl);

    async function prepareRecoverySession() {
      setIsRecovery(true);
      setRecoveryReady(false);
      setRecoveryError("");
      setRecoveryMessage("Checking your password recovery link...");

      if (!accessToken || !refreshToken) {
        setRecoveryError(
          "This recovery link is incomplete. Send a new password recovery email and try again.",
        );
        setRecoveryMessage("");
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (!isActive) {
        return;
      }

      if (error) {
        setRecoveryError(
          "This recovery link could not be verified. Send a new password recovery email and try again.",
        );
        setRecoveryMessage("");
        return;
      }

      setRecoveryReady(true);
      setRecoveryMessage("Enter a new password for the private owner account.");
    }

    void prepareRecoverySession();

    return () => {
      isActive = false;
    };
  }, [isConfigured]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecoveryError("");

    if (newPassword.length < 6) {
      setRecoveryError("Use a password with at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setRecoveryError("The two password entries do not match.");
      return;
    }

    setRecoveryPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setRecoveryPending(false);
      setRecoveryError(
        "The password could not be updated. Send a new password recovery email and try again.",
      );
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    setNewPassword("");
    setConfirmPassword("");
    setIsRecovery(false);
    setRecoveryPending(false);
    setRecoveryReady(false);
    setRecoveryMessage("Password updated. Sign in with your new password.");
  }

  if (isRecovery) {
    const isRecoveryDisabled = recoveryPending || !recoveryReady;

    return (
      <form
        className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
        onSubmit={updatePassword}
      >
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            New password
          </span>
          <input
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            type="password"
            name="new-password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            disabled={isRecoveryDisabled}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Confirm new password
          </span>
          <input
            className="min-h-12 w-full rounded-md border border-[var(--border)] bg-white px-3 text-base outline-none focus:border-[var(--accent)] disabled:bg-[var(--surface-strong)]"
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={isRecoveryDisabled}
          />
        </label>

        {recoveryMessage ? (
          <p className="rounded-md border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-semibold text-[var(--muted)]">
            {recoveryMessage}
          </p>
        ) : null}

        {recoveryError ? (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
            role="alert"
          >
            {recoveryError}
          </p>
        ) : null}

        <button
          className="min-h-12 w-full rounded-md bg-[var(--accent)] px-4 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-[var(--muted)]"
          type="submit"
          disabled={isRecoveryDisabled}
        >
          {recoveryPending ? "Updating password..." : "Update password"}
        </button>
      </form>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-4 rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <input name="next" type="hidden" value={nextPath} />

      {recoveryMessage ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          {recoveryMessage}
        </p>
      ) : null}

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
