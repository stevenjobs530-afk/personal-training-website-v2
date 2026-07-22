import { AppShell } from "../_components/app-shell";
import { PlaceholderPage } from "../_components/placeholder-page";
import { requireAuth } from "@/lib/auth/require-auth";
import { getAppPreferences } from "@/lib/preferences";
import { SettingsPanel } from "./settings-panel";

export const dynamic = "force-dynamic";

const setupItems = [
  { label: "Supabase Auth", status: "Ready" },
  { label: "Protected routes", status: "Ready" },
  { label: "Logout behavior", status: "Ready" },
  { label: "Database migrations", status: "Pending" },
];

const installSteps = [
  {
    title: "Open the production site in Safari",
    description: "Installation must be started from Safari on your iPhone.",
  },
  {
    title: "Tap Share",
    description: "Use the Share button in Safari's toolbar.",
  },
  {
    title: "Choose Add to Home Screen",
    description: "Turn on Open as Web App, then tap Add.",
  },
];

export default async function SettingsPage() {
  await requireAuth("/settings");
  const preferences = await getAppPreferences();
  const zh = preferences.locale === "zh";

  return (
    <AppShell>
      <PlaceholderPage
        eyebrow={zh ? "设置" : "Settings"}
        title={zh ? "安装与私人数据" : "Install and private data"}
        description={zh ? "设置语言和单位、导出训练记录，并将网站添加到 iPhone 主屏幕。" : "Set language and units, export your training records, and add the site to your iPhone Home Screen."}
      >
        <section className="install-app-card ui-card">
          <header className="install-app-card__header">
            <div>
              <h2>Three taps from Safari</h2>
              <p>
                Your login, training records and future website updates continue
                to use the same secure web app.
              </p>
            </div>
            <span>Ready for iPhone</span>
          </header>

          <ol className="install-app-steps">
            {installSteps.map((step, index) => (
              <li key={step.title}>
                <span aria-hidden="true">{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="install-app-note">
            After installation, launch the blue Personal Training icon from your
            Home Screen. Internet access is still required to read and save
            Supabase training data.
          </p>
        </section>

        <section className="ui-card p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-[var(--foreground)]">
            System status
          </h2>
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
        </section>

        <SettingsPanel preferences={preferences} />
      </PlaceholderPage>
    </AppShell>
  );
}
