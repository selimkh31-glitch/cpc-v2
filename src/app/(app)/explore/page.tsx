import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";

/** Explorer (cahier UX §5). Sessions, clubs et joueurs arrivent avec leurs phases : aucune disponibilité fictive. */
export default async function ExplorePage() {
  await requireOnboardedUser("/explore");
  const t = await getTranslations("explore");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p role="status" className="text-sm opacity-80">{t("unavailable")}</p>
    </main>
  );
}
