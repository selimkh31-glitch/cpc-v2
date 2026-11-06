import { notFound } from "next/navigation";
import { z } from "zod";
import { PageTitle } from "@/components/layout/shell-title";
import { SubmitButton } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { InlineStatus } from "@/components/ui/inline-status";
import { TextArea } from "@/components/ui/text-field";
import { updateClubAction } from "@/features/clubs/actions";
import { CLUB_LANGUAGES, CLUB_LEVELS } from "@/features/clubs/contract";
import { getClubDetail } from "@/features/clubs/queries";
import { POSITION_GROUPS } from "@/features/onboarding/referentials";
import { requireOnboardedUser } from "@/lib/auth/session";

const LEVEL: Record<string, string> = { casual: "Loisir", intermediate: "Intermédiaire", competitive: "Compétitif", elite: "Élite" };
const ERROR: Record<string, string> = {
  VALIDATION: "Vérifie les informations saisies.",
  CONFLICT: "Ce club a été modifié ailleurs. Recharge la page avant de réessayer.",
  FORBIDDEN: "Tu n'as pas l'autorisation de gérer ce club.",
  NOT_FOUND: "Club introuvable ou indisponible.",
  RATE_LIMITED: "Trop de modifications. Réessaie plus tard.",
  UNKNOWN: "Impossible d'enregistrer ces modifications.",
};

export default async function ClubSettingsPage({ params, searchParams }: PageProps<"/clubs/[clubId]/manage/settings">) {
  const { clubId } = await params;
  if (!z.uuid().safeParse(clubId).success) notFound();
  const user = await requireOnboardedUser("/clubs/" + clubId + "/manage/settings");
  const [club, query] = await Promise.all([getClubDetail(clubId, user.userId), searchParams]);
  if (!club || !club.canManage) notFound();
  const error = typeof query.error === "string" ? ERROR[query.error] : null;
  const legend = "mb-3 px-1 text-subhead font-medium text-ink-2";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-8 pt-4">
      <PageTitle>Réglages du club</PageTitle>
      <p className="text-subhead text-ink-2">{club.name} · Réservé au propriétaire et aux managers du club.</p>
      {error ? <InlineStatus kind="error">{error}</InlineStatus> : null}
      <form action={updateClubAction} className="flex flex-col gap-5">
        <input type="hidden" name="requestId" value={crypto.randomUUID()} />
        <input type="hidden" name="clubId" value={club.id} />
        <input type="hidden" name="expectedUpdatedAt" value={club.updatedAt} />
        <TextArea label="Description" name="description" maxLength={500} rows={4} defaultValue={club.description ?? ""} />
        <fieldset>
          <legend className={legend}>Langues (1 à 3)</legend>
          <div className="grid grid-cols-3 gap-2">
            {CLUB_LANGUAGES.map((l) =>
              <ChoiceChip key={l} type="checkbox" name="languages" value={l} label={l.toUpperCase()}
                defaultChecked={club.languages.includes(l)} />)}
          </div>
        </fieldset>
        <fieldset>
          <legend className={legend}>Niveau déclaré</legend>
          <div className="grid grid-cols-2 gap-2">
            {CLUB_LEVELS.map((level) => <ChoiceChip key={level} type="radio" name="level" value={level}
              label={LEVEL[level] ?? level} required defaultChecked={club.level === level} />)}
          </div>
        </fieldset>
        <fieldset>
          <legend className={legend}>Recrutement</legend>
          <div className="grid grid-cols-2 gap-2">
            <ChoiceChip type="radio" name="recruitingOpen" value="true" label="Ouvert" defaultChecked={club.recruitingOpen} required />
            <ChoiceChip type="radio" name="recruitingOpen" value="false" label="Fermé" defaultChecked={!club.recruitingOpen} required />
          </div>
        </fieldset>
        <fieldset>
          <legend className={legend}>Postes recherchés</legend>
          <div className="flex flex-col gap-4">
            {POSITION_GROUPS.map((group) => <div key={group.key}>
              <p className="mb-2 px-1 text-caption uppercase text-ink-3">{group.key}</p>
              <div className="grid grid-cols-4 gap-2">
                {group.positions.map((p) => <ChoiceChip key={p} type="checkbox" name="recruitingPositions" value={p}
                  label={p} defaultChecked={club.recruitingPositions.includes(p)} />)}
              </div>
            </div>)}
          </div>
        </fieldset>
        <SubmitButton size="lg" pendingLabel="Enregistrement…">Enregistrer les modifications</SubmitButton>
      </form>
    </main>
  );
}
