import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";
import { PageTitle } from "@/components/layout/shell-title";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedUser } from "@/lib/auth/session";

/**
 * Explorer (cahier UX §5). Les sous-intentions Jouer / Clubs / Joueurs arrivent avec leurs lots
 * (P2-F, P2-J) : aucune disponibilité fictive, aucun contrôle sans donnée réelle.
 */
export default async function ExplorePage() {
  await requireOnboardedUser("/explore");
  const t = await getTranslations("explore");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <PageTitle>{t("title")}</PageTitle>
      <EmptyState icon={<Compass />} title={t("emptyTitle")} description={t("unavailable")} />
    </main>
  );
}
