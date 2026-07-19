"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

type TopNavigationProps = {
  items: NavItem[];
};

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
