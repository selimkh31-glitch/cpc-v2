"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useShellTitle } from "./shell-title";

/**
 * En-tête du shell (cahier UX §2) : matière translucide, titre compact qui apparaît quand le grand
 * titre de l'écran défile hors de vue. Les emplacements Radar et notifications restent vides tant que
 * ces fonctionnalités n'existent pas (aucun bouton factice) : lots P2-B et P2-G.
 */
export function AppHeader() {
  const t = useTranslations("app");
  const compact = useShellTitle();
  return (
    <header className="material sticky top-0 z-40 pt-[env(safe-area-inset-top)] hairline-b">
      <div className="relative mx-auto flex min-h-11 max-w-md items-center justify-between px-4">
        <span aria-hidden={compact ? true : undefined} className={cn("text-headline transition-opacity duration-200", compact ? "opacity-0" : "opacity-100")}>
          {t("shortName")}
        </span>
        <span
          aria-hidden
          data-testid="header-compact-title"
          className={cn(
            "pointer-events-none absolute inset-x-16 truncate text-center text-headline transition-opacity duration-200",
            compact ? "opacity-100" : "opacity-0",
          )}
        >
          {compact}
        </span>
        <div data-slot="header-actions" className="flex items-center gap-1" />
      </div>
    </header>
  );
}
