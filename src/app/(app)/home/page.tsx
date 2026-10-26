import { getTranslations } from "next-intl/server";
import { requireOnboardedUser } from "@/lib/auth/session";
import { signOutAction } from "@/features/auth/actions";

/** Accueil provisoire : aucun contenu métier tant que l'Accueil contextuel (ACC) n'est pas implémenté. */
export default async function HomePage() {
  await requireOnboardedUser("/home");
  const t = await getTranslations("appHome");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p role="status">{t("empty")}</p>
      <form action={signOutAction}>
        <input type="hidden" name="scope" value="local" />
        <button type="submit" className="min-h-11 rounded-card border px-4">{t("signOut")}</button>
      </form>
    </main>
  );
}
