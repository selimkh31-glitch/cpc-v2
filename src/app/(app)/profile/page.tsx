import { getTranslations } from "next-intl/server";
import { PendingButton } from "@/components/states/pending-button";
import { StatePanel } from "@/components/states/state-panel";
import { signOutAction } from "@/features/auth/actions";
import { removeAvatarAction, updateGamertagAction, updatePresentationAction, uploadAvatarAction } from "@/features/profiles/actions";
import { signedAvatarUrl } from "@/features/profiles/media";
import { getOwnProfile } from "@/features/profiles/queries";
import { requireOnboardedUser } from "@/lib/auth/session";

const SAVED = new Set(["presentation", "gamertag", "avatar", "avatar_removed"]);
const ERRORS = new Set(["presentation", "gamertag", "avatar_missing", "avatar_size", "avatar_type", "avatar_upload", "avatar_remove"]);

/**
 * Profil personnel (PRO-01, S-1.9). Identité réelle lue en base ; édition par panneaux courts et
 * enregistrements indépendants (cahier UX §7). Statistiques EA indisponibles (D-04) : aucune métrique inventée.
 */
export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireOnboardedUser("/profile");
  const [profile, params] = await Promise.all([getOwnProfile(user.userId), searchParams]);
  const avatarUrl = await signedAvatarUrl(profile?.avatarPath ?? null);
  const t = await getTranslations("profile");
  const tRef = await getTranslations("onboarding");
  const tStates = await getTranslations("states");
  const saved = typeof params.saved === "string" && SAVED.has(params.saved) ? params.saved : null;
  const error = typeof params.error === "string" && ERRORS.has(params.error) ? params.error : null;
  const panel = "flex flex-col gap-3 rounded-card border border-foreground/15 p-4";
  const input = "min-h-11 rounded-card border px-3";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {saved ? <p role="status" className="rounded-card border p-3 text-sm">{t(`saved.${saved}`)}</p> : null}
      {error ? <StatePanel kind="error" title={t(`errors.${error}`)} /> : null}

      {profile ? (
        <>
          <section aria-labelledby="profile-identity" className={panel}>
            <h2 id="profile-identity" className="font-medium">{t("identity")}</h2>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                // URL signée privée (ADR-0015) : pas d'optimiseur next/image, qui la mettrait en cache côté serveur.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={t("avatarAlt")} width={72} height={72} className="size-18 rounded-full object-cover" data-testid="profile-avatar" />
              ) : (
                <div aria-hidden className="flex size-18 items-center justify-center rounded-full bg-foreground/10 text-xl font-semibold uppercase">
                  {profile.handle.slice(0, 2)}
                </div>
              )}
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
            </div>
          </section>

          <section aria-labelledby="profile-avatar" className={panel}>
            <h2 id="profile-avatar" className="font-medium">{t("avatarTitle")}</h2>
            <form action={uploadAvatarAction} className="flex flex-col gap-2">
              <label htmlFor="avatar" className="text-sm">{t("avatarLabel")}</label>
              <input id="avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" required aria-describedby="avatar-hint" className="text-sm" />
              <span id="avatar-hint" className="text-xs opacity-70">{t("avatarHint")}</span>
              <PendingButton pendingLabel={tStates("pending")} className="border">{t("avatarSubmit")}</PendingButton>
            </form>
            {profile.avatarPath ? (
              <form action={removeAvatarAction}>
                <PendingButton pendingLabel={tStates("pending")} className="border">{t("avatarRemove")}</PendingButton>
              </form>
            ) : null}
          </section>

          <section aria-labelledby="profile-presentation" className={panel}>
            <h2 id="profile-presentation" className="font-medium">{t("presentationTitle")}</h2>
            <form action={updatePresentationAction} className="flex flex-col gap-2">
              <label htmlFor="bio" className="text-sm">{t("bioLabel")}</label>
              <textarea id="bio" name="bio" maxLength={280} rows={3} defaultValue={profile.bio ?? ""} aria-describedby="bio-hint" className={`${input} py-2`} />
              <span id="bio-hint" className="text-xs opacity-70">{t("bioHint")}</span>
              <PendingButton pendingLabel={tStates("pending")} className="border">{t("save")}</PendingButton>
            </form>
          </section>

          <section aria-labelledby="profile-ea" className={panel}>
            <h2 id="profile-ea" className="font-medium">{t("eaTitle")}</h2>
            <form action={updateGamertagAction} className="flex flex-col gap-2">
              <label htmlFor="eaGamertag" className="text-sm">{t("eaLabel")}</label>
              <input id="eaGamertag" name="eaGamertag" maxLength={32} defaultValue={profile.eaGamertag ?? ""} aria-describedby="ea-hint" className={input} />
              <span id="ea-hint" className="text-xs opacity-70">{t("eaHint")}</span>
              <PendingButton pendingLabel={tStates("pending")} className="border">{t("save")}</PendingButton>
            </form>
          </section>
        </>
      ) : null}

      <section aria-labelledby="profile-stats" className={panel}>
        <h2 id="profile-stats" className="font-medium">{t("statsTitle")}</h2>
        <p className="text-sm opacity-80">{t("statsUnavailable")}</p>
      </section>

      <section aria-labelledby="profile-settings" className={panel}>
        <h2 id="profile-settings" className="font-medium">{t("settingsTitle")}</h2>
        <form action={signOutAction}>
          <input type="hidden" name="scope" value="local" />
          <PendingButton pendingLabel={tStates("pending")} className="border">{t("signOut")}</PendingButton>
        </form>
      </section>
    </main>
  );
}
