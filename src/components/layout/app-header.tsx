import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * En-tête du shell (cahier UX §2). Les emplacements Radar, messages et notifications
 * n'affichent rien tant que ces fonctionnalités n'existent pas (aucun bouton factice).
 */
export async function AppHeader() {
  const t = await getTranslations("app");
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/15 bg-background pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-14 max-w-md items-center justify-between px-4">
        <Link href="/home" className="flex min-h-11 items-center font-semibold">
          {t("name")}
        </Link>
        {/* Emplacements réservés : Radar (Phase 3), messages et notifications (Phase 5). */}
        <div data-slot="header-actions" className="flex items-center gap-2" />
      </div>
    </header>
  );
}
