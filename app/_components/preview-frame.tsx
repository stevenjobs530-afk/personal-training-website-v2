"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { DesktopIcon } from "@phosphor-icons/react/dist/csr/Desktop";
import { DeviceMobileIcon } from "@phosphor-icons/react/dist/csr/DeviceMobile";
import { DeviceTabletIcon } from "@phosphor-icons/react/dist/csr/DeviceTablet";

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
    return <DeviceMobileIcon aria-hidden="true" size={19} weight="bold" />;
  }

  if (mode === "ipad") {
    return <DeviceTabletIcon aria-hidden="true" size={20} weight="bold" />;
  }

  return <DesktopIcon aria-hidden="true" size={21} weight="bold" />;
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
    <div className="preview-frame">
      <div
        className="preview-canvas"
        data-preview-mode={previewMode}
        style={{ maxWidth: `${selectedMode.width}px` }}
      >
        <div className="preview-controls">
          <span className="preview-controls-label">Preview width</span>
          <div className="preview-controls-group">
            {previewModes.map((mode) => {
              const isSelected = mode.id === previewMode;

              return (
                <button
                  aria-pressed={isSelected}
                  className="preview-control-button"
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
    <nav className="top-nav-shell" aria-label="Primary navigation">
      <div className="top-nav-scroller">
        <div className="top-nav-list">
          {items.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className="top-nav-link"
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
