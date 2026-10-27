import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/layout/app-header";
import { OfflineBanner } from "@/components/states/offline-banner";
import { ShellTitleProvider } from "@/components/layout/shell-title";
import { TabBar } from "@/components/layout/tab-bar";
import { REQUEST_PATH_HEADER, safeNextPath } from "@/lib/auth/redirect";
import { requireOnboardedUser } from "@/lib/auth/session";

/** Shell authentifié (ADR-0005, S-1.7) : en-tête + contenu + trois onglets. Garde serveur. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // Retour au contexte (AUTH-05) : chemin demandé, assaini (anti open redirect).
  const requested = safeNextPath((await headers()).get(REQUEST_PATH_HEADER));
  await requireOnboardedUser(requested);
  const t = await getTranslations("nav");
  return (
    <ShellTitleProvider>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-row focus:bg-surface-1 focus:p-3">
        {t("skipToContent")}
      </a>
      <OfflineBanner />
      <AppHeader />
      <div id="contenu" className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <TabBar />
    </ShellTitleProvider>
  );
}
