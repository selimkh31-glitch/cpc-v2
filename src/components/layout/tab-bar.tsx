"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { isTabActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Cahier UX §1–2 : trois onglets persistants, aucun onglet Messages. */
export const TABS = [
  { href: "/home", key: "home", icon: HomeIcon },
  { href: "/explore", key: "explore", icon: CompassIcon },
  { href: "/profile", key: "profile", icon: UserIcon },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <nav
      aria-label={t("tabsLabel")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-foreground/15 bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = isTabActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs focus-visible:outline-2 focus-visible:outline-offset-[-2px]",
                  active ? "font-semibold" : "opacity-70",
                )}
              >
                <Icon aria-hidden className="size-6" />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

type IconProps = React.SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function HomeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </svg>
  );
}

function CompassIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </svg>
  );
}

function UserIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
