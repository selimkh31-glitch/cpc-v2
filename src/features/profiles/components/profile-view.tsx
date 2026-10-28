import { getTranslations } from "next-intl/server";
import { BarChart3, Gamepad2, ImageIcon, Text } from "lucide-react";
import { PageTitle } from "@/components/layout/shell-title";
import { StatePanel } from "@/components/states/state-panel";
import { Avatar } from "@/components/ui/avatar";
import { SubmitButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InlineStatus } from "@/components/ui/inline-status";
import { ListSection } from "@/components/ui/list";
import { SheetLauncher } from "@/components/ui/sheet-launcher";
import { TextArea, TextField } from "@/components/ui/text-field";
import { signOutAction } from "@/features/auth/actions";
import { removeAvatarAction, updateGamertagAction, updatePresentationAction, uploadAvatarAction } from "@/features/profiles/actions";
import type { OwnProfile } from "@/features/profiles/queries";


/**
 * Vue du profil personnel (présentation seule ; données fournies par la page). Profil personnel (PRO-01, S-1.9 ; P2-A). Identité réelle lue en base ; édition par panneaux courts
 * (sheets) et enregistrements indépendants (cahier UX §7, PRO-05). Statistiques EA indisponibles
 * (D-04) : aucune métrique inventée. Mêmes Server Actions et validations qu'en Phase 1.
 */
export async function ProfileView({ profile, avatarUrl, saved, error }: { profile: OwnProfile | null; avatarUrl: string | null; saved: string | null; error: string | null }) {
  const t = await getTranslations("profile");
  const tRef = await getTranslations("onboarding");
  const tStates = await getTranslations("states");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <PageTitle>{t("title")}</PageTitle>
      {saved ? <InlineStatus kind="success">{t(`saved.${saved}`)}</InlineStatus> : null}
      {error ? <StatePanel kind="error" title={t(`errors.${error}`)} /> : null}

      {profile ? (
        <>
          {/* Carte d'identité compacte (finition P2-A) : avatar à gauche, identité et postes à droite. */}
          <section aria-label={t("identity")} className="flex items-center gap-4 rounded-hero bg-surface-1 p-4">
            <Avatar src={avatarUrl} alt={t("avatarAlt")} fallback={profile.handle} size={72} testId="profile-avatar" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-title-2" data-testid="profile-handle">{profile.handle}</p>
              <p className="text-subhead text-ink-2">{tRef(`platforms.${profile.platform}`)}</p>
              <dl className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <dt className="sr-only">{t("mainPosition")}</dt>
                <dd className="flex">
                  <Chip selected>{tRef(`positions.${profile.mainPosition}`)}</Chip>
                </dd>
                <dt className="sr-only">{t("secondaryPositions")}</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {profile.secondaryPositions.length ? profile.secondaryPositions.map((p) => <Chip key={p}>{p}</Chip>) : <span className="sr-only">{t("none")}</span>}
                </dd>
              </dl>
            </div>
          </section>

          <ListSection title={t("sectionProfile")} footer={t("eaHint")}>
            <li>
              <SheetLauncher
                trigger={{ kind: "row", icon: <Text />, label: t("presentationTitle"), detail: profile.bio || t("noPresentation") }}
                title={t("presentationTitle")}
                description={t("editPresentation")}
                closeLabel={t("close")}
              >
                <form action={updatePresentationAction} className="flex flex-col gap-4">
                  <TextArea label={t("bioLabel")} name="bio" maxLength={280} rows={4} defaultValue={profile.bio ?? ""} hint={t("bioHint")} />
                  <SubmitButton size="lg" pendingLabel={tStates("pending")}>{t("save")}</SubmitButton>
                </form>
              </SheetLauncher>
            </li>
            <li>
              <SheetLauncher
                trigger={{ kind: "row", icon: <Gamepad2 />, label: t("eaTitle"), detail: profile.eaGamertag || t("notProvided") }}
                title={t("eaTitle")}
                description={t("editGamertag")}
                closeLabel={t("close")}
              >
                <form action={updateGamertagAction} className="flex flex-col gap-4">
                  <TextField label={t("eaLabel")} name="eaGamertag" maxLength={32} defaultValue={profile.eaGamertag ?? ""} hint={t("eaFieldHint")} autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                  <SubmitButton size="lg" pendingLabel={tStates("pending")}>{t("save")}</SubmitButton>
                </form>
              </SheetLauncher>
            </li>
            <li>
              <SheetLauncher
                trigger={{ kind: "row", icon: <ImageIcon />, label: t("avatarRow"), detail: profile.avatarPath ? t("avatarRowSet") : t("avatarRowNone") }}
                title={t("avatarTitle")}
                description={t("editAvatar")}
                closeLabel={t("close")}
              >
                <div className="flex flex-col gap-4">
                  <form action={uploadAvatarAction} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="avatar" className="px-1 text-subhead font-medium text-ink-2">{t("avatarLabel")}</label>
                      <input
                        id="avatar"
                        name="avatar"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        required
                        aria-describedby="avatar-hint"
                        className="w-full rounded-field bg-surface-2 p-2 text-subhead text-ink-2 file:mr-3 file:min-h-10 file:rounded-field file:border-0 file:bg-surface-3 file:px-4 file:font-semibold file:text-ink"
                      />
                      <p id="avatar-hint" className="px-1 text-footnote text-ink-3">{t("avatarHint")}</p>
                    </div>
                    <SubmitButton size="lg" pendingLabel={tStates("pending")}>{t("avatarSubmit")}</SubmitButton>
                  </form>
                  {profile.avatarPath ? (
                    <form action={removeAvatarAction}>
                      <SubmitButton size="lg" variant="destructive" pendingLabel={tStates("pending")}>{t("avatarRemove")}</SubmitButton>
                    </form>
                  ) : null}
                </div>
              </SheetLauncher>
            </li>
          </ListSection>
        </>
      ) : null}

      {/* Données véridiques (D-04) : aucune statistique tant qu'aucune source EA n'est autorisée. */}
      <section aria-label={t("statsTitle")} className="flex flex-col gap-2">
        <h2 className="px-4 text-footnote uppercase tracking-wide text-ink-3">{t("statsTitle")}</h2>
        <div className="flex items-start gap-3 rounded-row bg-surface-1 px-4 py-3">
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-field bg-surface-2 text-ink-2">
            <BarChart3 className="size-[1.125rem]" />
          </span>
          <p className="text-subhead text-ink-2">{t("statsUnavailable")}</p>
        </div>
      </section>

      <section aria-label={t("sectionAccount")} className="flex flex-col gap-2">
        <h2 className="px-4 text-footnote uppercase tracking-wide text-ink-3">{t("sectionAccount")}</h2>
        <form action={signOutAction}>
          <input type="hidden" name="scope" value="local" />
          <SubmitButton size="lg" variant="destructive" pendingLabel={tStates("pending")}>{t("signOut")}</SubmitButton>
        </form>
      </section>
    </main>
  );
}
