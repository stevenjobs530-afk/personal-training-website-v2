"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarbellIcon } from "@phosphor-icons/react/dist/csr/Barbell";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/csr/DotsThree";
import { HouseIcon } from "@phosphor-icons/react/dist/csr/House";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/csr/ListBullets";

type NavItem = { href: string; label: string };

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavigation({
  labels,
  moreItems,
}: {
  labels: {
    exercises: string;
    more: string;
    progress: string;
    today: string;
    workouts: string;
  };
  moreItems: NavItem[];
}) {
  const pathname = usePathname();
  const moreIsActive = moreItems.some((item) => isActivePath(pathname, item.href));
  const primaryItems = [
    { href: "/dashboard", icon: HouseIcon, label: labels.today },
    { href: "/exercises", icon: ListBulletsIcon, label: labels.exercises },
    { href: "/workouts", icon: BarbellIcon, label: labels.workouts },
    { href: "/progress", icon: ChartLineUpIcon, label: labels.progress },
  ];

  return (
    <nav aria-label="Mobile navigation" className="mobile-nav-shell">
      <div className="mobile-nav-list">
        {primaryItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className="mobile-nav-link"
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" size={21} weight={active ? "fill" : "bold"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <details className="mobile-more">
          <summary
            aria-current={moreIsActive ? "page" : undefined}
            className="mobile-nav-link"
          >
            <DotsThreeIcon aria-hidden="true" size={23} weight="bold" />
            <span>{labels.more}</span>
          </summary>
          <div className="mobile-more-menu">
            {moreItems.map((item) => (
              <Link
                aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </details>
      </div>
    </nav>
  );
}
