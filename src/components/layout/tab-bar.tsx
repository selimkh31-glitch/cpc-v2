"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleUserRound, Compass, House } from "lucide-react";
import { isTabActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Cahier UX §1–2 : trois onglets persistants, aucun onglet Messages. */
export const TABS = [
  { href: "/home", key: "home", icon: House },
  { href: "/explore", key: "explore", icon: Compass },
  { href: "/profile", key: "profile", icon: CircleUserRound },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <nav aria-label={t("tabsLabel")} className="material fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] hairline-t">
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = isTabActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-caption transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
                  active ? "text-accent" : "text-ink-2",
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
