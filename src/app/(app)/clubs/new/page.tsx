import { PageTitle } from "@/components/layout/shell-title";
import { SubmitButton } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { InlineStatus } from "@/components/ui/inline-status";
import { TextArea, TextField } from "@/components/ui/text-field";
import { createClubAction } from "@/features/clubs/actions";
import { CLUB_LANGUAGES, CLUB_LEVELS } from "@/features/clubs/contract";
import { OnboardingStepper } from "@/features/onboarding/components/onboarding-stepper";
import { PLATFORMS, POSITION_GROUPS } from "@/features/onboarding/referentials";
import { getOwnProfile } from "@/features/profiles/queries";
import { requireOnboardedUser } from "@/lib/auth/session";

const PLAT_LABEL: Record<string, string> = { ps5: "PS5", xbox_series: "Xbox Series", pc: "PC" };
const LANG_LABEL: Record<string, string> = { fr: "Français", en: "Anglais", es: "Espagnol", it: "Italien", de: "Allemand", pt: "Portugais", nl: "Néerlandais", ar: "Arabe" };
const LEVEL_LABEL: Record<string, string> = { casual: "Loisir", intermediate: "Intermédiaire", competitive: "Compétitif", elite: "Élite" };
const ERROR: Record<string, string> = {
  VALIDATION: "Vérifie les informations du club, les langues et les postes.",
  CONFLICT: "Ce nom de club est déjà utilisé.",
  LIMIT_REACHED: "Tu peux avoir au maximum deux affiliations actives.",
  RATE_LIMITED: "Tu peux créer un seul club toutes les 24 heures.",
  UNAUTHENTICATED: "Connecte-toi pour créer ton club.",
  UNKNOWN: "Impossible de créer ton club pour le moment. Réessaie.",
};

export default async function CreateClubPage({ searchParams }: PageProps<"/clubs/new">) {
  const user = await requireOnboardedUser("/clubs/new");
  const [profile, params] = await Promise.all([getOwnProfile(user.userId), searchParams]);
  const error = typeof params.error === "string" ? ERROR[params.error] : null;
  const legend = "mb-3 px-1 text-subhead font-medium text-ink-2";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <PageTitle>Créer un club</PageTitle>
      <p className="text-subhead text-ink-2">Crée ton club EA FC Clubs en trois étapes. Tu restes joueur et deviens propriétaire de ce club.</p>
      {error ? <InlineStatus kind="error">{error}</InlineStatus> : null}
      <form action={createClubAction} className="flex flex-col">
        <input type="hidden" name="requestId" value={crypto.randomUUID()} />
        <OnboardingStepper
          steps={[
            { title: "Identité du club", content: (
              <div className="flex flex-col gap-5">
                <TextField label="Nom du club" name="name" required minLength={3} maxLength={32}
                  placeholder="Nom de ton club" autoComplete="off" hint="3 à 32 caractères. Ce nom doit être unique." />
                <TextArea label="Description" name="description" maxLength={500} rows={4}
                  hint="Facultatif. Présente l'esprit de ton club (500 caractères maximum)." />
              </div>
            ) },
            { title: "Jeu et communauté", content: (
              <div className="flex flex-col gap-5">
                <fieldset>
                  <legend className={legend}>Plateforme</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {PLATFORMS.map((p) => <ChoiceChip key={p} type="radio" name="platform" value={p}
                      label={PLAT_LABEL[p] ?? p} defaultChecked={p === profile?.platform} required />)}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className={legend}>Langues du club (1 à 3)</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {CLUB_LANGUAGES.map((lang) => <ChoiceChip key={lang} type="checkbox" name="languages" value={lang}
                      label={LANG_LABEL[lang] ?? lang} defaultChecked={lang === "fr"} />)}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className={legend}>Niveau déclaré</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {CLUB_LEVELS.map((l) => <ChoiceChip key={l} type="radio" name="level" value={l}
                      label={LEVEL_LABEL[l] ?? l} required />)}
                  </div>
                  <p className="mt-2 text-footnote text-ink-3">Le niveau est déclaré par le créateur, pas vérifié par CPC.</p>
                </fieldset>
              </div>
            ) },
            { title: "Recrutement", content: (
              <div className="flex flex-col gap-5">
                <fieldset>
                  <legend className={legend}>Le club recrute-t-il ?</legend>
                  <div className="grid grid-cols-2 gap-2">
                    <ChoiceChip type="radio" name="recruitingOpen" value="true" label="Oui, ouvert" defaultChecked required />
                    <ChoiceChip type="radio" name="recruitingOpen" value="false" label="Non, fermé" required />
                  </div>
                </fieldset>
                <fieldset>
                  <legend className={legend}>Postes recherchés (facultatif)</legend>
                  <div className="flex flex-col gap-4">
                    {POSITION_GROUPS.map((group) => (
                      <div key={group.key} className="flex flex-col gap-2">
                        <p className="px-1 text-caption uppercase tracking-wide text-ink-3">{group.key}</p>
                        <div className="grid grid-cols-4 gap-2">
                          {group.positions.map((p) => <ChoiceChip key={p} type="checkbox" name="recruitingPositions"
                            value={p} label={p} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
                <SubmitButton size="lg" pendingLabel="Création en cours…">Créer mon club</SubmitButton>
              </div>
            ) },
          ]}
          labels={{ next: "Continuer", back: "Retour", progress: ["Étape 1 sur 3", "Étape 2 sur 3", "Étape 3 sur 3"] }}
        />
      </form>
    </main>
  );
}
