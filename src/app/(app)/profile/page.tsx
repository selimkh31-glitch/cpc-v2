import { getTranslations } from "next-intl/server";
import { PendingButton } from "@/components/states/pending-button";
import { signOutAction } from "@/features/auth/actions";
import { getOwnProfile } from "@/features/profiles/queries";
import { requireOnboardedUser } from "@/lib/auth/session";

/**
 * Profil personnel (PRO-01). Identité réelle lue en base ; statistiques EA et réputation affichées
 * comme indisponibles (aucune source autorisée, D-04 ; avis en Phase 5) : aucune métrique inventée.
 */
export default async function ProfilePage() {
  const user = await requireOnboardedUser("/profile");
  const profile = await getOwnProfile(user.userId);
  const t = await getTranslations("profile");
  const tRef = await getTranslations("onboarding");
  const tStates = await getTranslations("states");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {profile ? (
        <section aria-labelledby="profile-identity" className="flex flex-col gap-2 rounded-card border border-foreground/15 p-4">
          <h2 id="profile-identity" className="font-medium">{t("identity")}</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="opacity-70">{t("handle")}</dt>
            <dd data-testid="profile-handle">{profile.handle}</dd>
            <dt className="opacity-70">{t("platform")}</dt>
            <dd>{tRef(`platforms.${profile.platform}`)}</dd>
            <dt className="opacity-70">{t("mainPosition")}</dt>
            <dd>{tRef(`positions.${profile.mainPosition}`)}</dd>
            <dt className="opacity-70">{t("secondaryPositions")}</dt>
            <dd>{profile.secondaryPositions.length ? profile.secondaryPositions.join(", ") : t("none")}</dd>
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="profile-stats" className="flex flex-col gap-2 rounded-card border border-foreground/15 p-4">
        <h2 id="profile-stats" className="font-medium">{t("statsTitle")}</h2>
        <p className="text-sm opacity-80">{t("statsUnavailable")}</p>
      </section>

      <section aria-labelledby="profile-settings" className="flex flex-col gap-3 rounded-card border border-foreground/15 p-4">
        <h2 id="profile-settings" className="font-medium">{t("settingsTitle")}</h2>
        <form action={signOutAction}>
          <input type="hidden" name="scope" value="local" />
          <PendingButton pendingLabel={tStates("pending")} className="border">{t("signOut")}</PendingButton>
        </form>
      </section>
    </main>
  );
}
