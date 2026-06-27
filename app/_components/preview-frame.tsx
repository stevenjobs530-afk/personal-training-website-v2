"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

type PreviewMode = "phone" | "ipad" | "desktop";

type NavItem = {
  href: string;
  label: string;
};

type PreviewFrameProps = {
  children: React.ReactNode;
};

type TopNavigationProps = {
  items: NavItem[];
};

const previewModes: { id: PreviewMode; label: string; width: number }[] = [
  { id: "phone", label: "Phone", width: 390 },
  { id: "ipad", label: "iPad", width: 820 },
  { id: "desktop", label: "Desktop", width: 1120 },
];
const previewStorageKey = "preview-width";
const previewStorageEvent = "preview-width-change";

function getStoredPreviewMode(value: string | null): PreviewMode {
  return previewModes.some((mode) => mode.id === value)
    ? (value as PreviewMode)
    : "desktop";
}

function DeviceIcon({ mode }: { mode: PreviewMode }) {
  if (mode === "phone") {
    return (
      <span
        aria-hidden="true"
        className="h-5 w-3 rounded-[3px] border-2 border-current"
      />
    );
  }

  if (mode === "ipad") {
    return (
      <span
        aria-hidden="true"
        className="h-3.5 w-6 rounded-[3px] border-2 border-current"
      />
    );
  }

  return (
    <span aria-hidden="true" className="flex flex-col items-center gap-0.5">
      <span className="h-3.5 w-6 rounded-[2px] border-2 border-current" />
      <span className="h-1 w-3 rounded-full bg-current" />
    </span>
  );
}

function getPreviewModeSnapshot() {
  return getStoredPreviewMode(window.localStorage.getItem(previewStorageKey));
}

function getPreviewModeServerSnapshot() {
  return "desktop" satisfies PreviewMode;
}

function subscribeToPreviewMode(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(previewStorageEvent, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(previewStorageEvent, callback);
  };
}

function savePreviewMode(mode: PreviewMode) {
  window.localStorage.setItem(previewStorageKey, mode);
  window.dispatchEvent(new Event(previewStorageEvent));
}

export function PreviewFrame({ children }: PreviewFrameProps) {
  const previewMode = useSyncExternalStore(
    subscribeToPreviewMode,
    getPreviewModeSnapshot,
    getPreviewModeServerSnapshot,
  );
  const selectedMode =
    previewModes.find((mode) => mode.id === previewMode) ?? previewModes[2];

  return (
    <div className="mx-auto w-full">
      <div
        className="mx-auto w-full transition-[max-width]"
        style={{ maxWidth: `${selectedMode.width}px` }}
      >
        <div className="mb-3 rounded-md bg-[#1d2a24] px-3 py-3 text-white">
          <div className="flex flex-wrap items-center gap-2 sm:justify-center">
            <span className="mr-1 text-sm font-bold text-white/80">
              Preview width:
            </span>
            {previewModes.map((mode) => {
              const isSelected = mode.id === previewMode;

              return (
                <button
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--accent-soft)] px-4 text-sm font-bold text-[var(--accent-strong)]"
                      : "inline-flex min-h-11 items-center gap-2 rounded-md bg-white/10 px-4 text-sm font-bold text-white/80 hover:bg-white/15 hover:text-white"
                  }
                  key={mode.id}
                  onClick={() => savePreviewMode(mode.id)}
                  type="button"
                >
                  <DeviceIcon mode={mode.id} />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNavigation({ items }: TopNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2 px-4 py-3 sm:px-6">
          {items.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "inline-flex min-h-12 items-center rounded-md bg-[var(--accent-soft)] px-4 text-sm font-bold text-[var(--accent-strong)]"
                    : "inline-flex min-h-12 items-center rounded-md px-4 text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface-strong)] hover:text-[var(--foreground)]"
                }
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
