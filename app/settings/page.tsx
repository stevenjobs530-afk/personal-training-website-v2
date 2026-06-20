import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

const setupItems = [
  { label: "Supabase Auth", status: "Ready" },
  { label: "Protected routes", status: "Ready" },
  { label: "Logout behavior", status: "Ready" },
  { label: "Database migrations", status: "Pending" },
];

export default async function SettingsPage() {
  await requireAuth("/settings");

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow="Settings"
        title="Setup status placeholder"
        description="Settings will hold sign out and setup status once authentication is wired in."
      >
        <ul className="space-y-3">
          {setupItems.map((item) => (
            <li
              key={item.label}
              className="flex min-h-14 items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-4"
            >
              <span className="font-semibold text-[var(--foreground)]">
                {item.label}
              </span>
              <span className="text-sm font-semibold text-[var(--muted)]">
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      </PlaceholderPage>
    </AppShell>
  );
}
