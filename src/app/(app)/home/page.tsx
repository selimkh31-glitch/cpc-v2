import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";

/**
 * Accueil (ACC-01, état « nouveau compte / aucune donnée »). Aucune donnée métier n'existe encore
 * (clubs Phase 2, Radar et LIVE Phase 3) : l'écran l'indique et oriente vers Explorer, sans contenu fictif.
 */
export default async function HomePage() {
  await requireOnboardedUser("/home");
  const t = await getTranslations("appHome");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <section aria-labelledby="home-activity" className="flex flex-col gap-3 rounded-card border border-foreground/15 p-4">
        <h2 id="home-activity" className="font-medium">{t("activityTitle")}</h2>
        <p role="status" className="text-sm opacity-80">{t("empty")}</p>
        <Link href="/explore" className="inline-flex min-h-11 items-center justify-center rounded-card bg-foreground px-4 font-medium text-background">
          {t("explore")}
        </Link>
      </section>
    </main>
  );
}
