import { randomUUID } from "node:crypto";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/layout/shell-title";
import { Button, SubmitButton } from "@/components/ui/button";
import { TextArea } from "@/components/ui/text-field";
import { StatePanel } from "@/components/states/state-panel";
import { CLUB_LANGUAGES, CLUB_LEVELS, type ClubLanguage, type ClubLevel } from "@/features/clubs/contract";
import { updateClubAction } from "@/features/clubs/actions";
import { getClubForViewer } from "@/features/clubs/queries";
import { POSITIONS } from "@/features/onboarding/referentials";
import { requireOnboardedUser } from "@/lib/auth/session";

const ERROR_TEXT: Record<string, string> = {
  VALIDATION: "Vérifie les paramètres choisis.",
  CONFLICT: "Le club a changé pendant ton édition. Recharge la page avant de recommencer.",
  RATE_LIMITED: "Trop de modifications rapprochées. Réessaie plus tard.",
  FORBIDDEN: "Tu n’es plus autorisé à gérer ce club.",
  NOT_FOUND: "Ce club n’est plus accessible.",
  UNKNOWN: "L’enregistrement n’a pas abouti.",
};
const LEVEL_LABELS: Record<ClubLevel, string> = { casual: "Loisir", intermediate: "Intermédiaire", competitive: "Compétitif", elite: "Élite" };

export default async function ClubSettingsPage({ params, searchParams }: PageProps<"/clubs/[clubId]/manage/settings">) {
  const { clubId } = await params;
  const user = await requireOnboardedUser("/clubs/" + encodeURIComponent(clubId) + "/manage/settings");
  const club = await getClubForViewer(clubId, user.userId);
  if (!club || !club.canManage) notFound();
  const query = await searchParams;
  const error = typeof query.error === "string" ? ERROR_TEXT[query.error] : null;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-8 pt-4">
      <Link href={"/clubs/" + club.id} className="min-h-11 w-fit text-subhead text-ink-2">Retour au club</Link>
      <PageTitle>Gérer le recrutement</PageTitle>
      <p className="text-subhead text-ink-2">{club.name}</p>
      {error ? <StatePanel kind="error" title={error} /> : null}
      <form action={updateClubAction} className="flex flex-col gap-5">
        <input type="hidden" name="clubId" value={club.id} />
        <input type="hidden" name="requestId" value={randomUUID()} />
        <input type="hidden" name="expectedUpdatedAt" value={club.updatedAt} />
        <div className="rounded-hero bg-surface-1 p-4">
          <TextArea label="Description" name="description" rows={4} maxLength={500} defaultValue={club.description ?? ""} />
        </div>
        <fieldset className="flex flex-col gap-2 rounded-hero bg-surface-1 p-4">
          <legend className="text-subhead font-semibold">Langues</legend>
          <div className="grid grid-cols-2 gap-2">
            {CLUB_LANGUAGES.map((l: ClubLanguage) => (
              <label key={l} className="flex min-h-11 items-center gap-2 text-subhead">
                <input type="checkbox" name="languages" value={l} defaultChecked={club.languages.includes(l)} />
                {l.toUpperCase()}
              </label>
            ))}
          </div>
          <p className="text-footnote text-ink-3">Une à trois langues.</p>
        </fieldset>
        <div className="flex flex-col gap-2 rounded-hero bg-surface-1 p-4">
          <label htmlFor="level" className="text-subhead font-semibold">Niveau déclaré</label>
          <select id="level" name="level" defaultValue={club.level} className="min-h-12 rounded-field bg-surface-2 px-3 text-body text-ink">
            {CLUB_LEVELS.map((level) => <option key={level} value={level}>{LEVEL_LABELS[level]}</option>)}
          </select>
        </div>
        <fieldset className="flex flex-col gap-3 rounded-hero bg-surface-1 p-4">
          <legend className="text-subhead font-semibold">Recrutement</legend>
          <label className="flex min-h-12 items-center gap-3">
            <input type="checkbox" name="recruitingOpen" value="true" defaultChecked={club.recruitingOpen} />
            Recrutement ouvert
          </label>
          <p className="text-footnote text-ink-2">Postes recherchés</p>
          <div className="grid grid-cols-3 gap-2">
            {POSITIONS.map((position) => (
              <label key={position} className="flex min-h-11 items-center gap-2 text-subhead">
                <input type="checkbox" name="recruitingPositions" value={position}
                  defaultChecked={club.recruitingPositions.includes(position)} />
                {position}
              </label>
            ))}
          </div>
        </fieldset>
        <SubmitButton pendingLabel="Enregistrement en cours…" size="lg">Enregistrer</SubmitButton>
      </form>
      <Button asChild variant="ghost"><Link href={"/clubs/" + club.id}>Annuler</Link></Button>
    </main>
  );
}
