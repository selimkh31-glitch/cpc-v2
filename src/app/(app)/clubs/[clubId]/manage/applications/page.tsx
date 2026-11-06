import { notFound } from "next/navigation";
import { z } from "zod";
import { PageTitle } from "@/components/layout/shell-title";
import { SubmitButton } from "@/components/ui/button";
import { InlineStatus } from "@/components/ui/inline-status";
import { getClubDetail } from "@/features/clubs/queries";
import { getPendingClubApplications } from "@/features/recruitment/queries";
import { decideApplicationAction } from "@/features/recruitment/actions";
import { requireOnboardedUser } from "@/lib/auth/session";

const ERRORS: Record<string, string> = {
  ALREADY_HANDLED: "Cette candidature a déjà été traitée.",
  EXPIRED: "La candidature a expiré. Recharge la page.",
  NOT_FOUND: "La candidature est indisponible.",
  CONFLICT: "Impossible d'accepter : affiliations ou statut modifiés.",
  FORBIDDEN: "Tu ne peux pas traiter cette candidature.",
  VALIDATION: "Décision invalide.",
  UNKNOWN: "La décision n'a pas pu être enregistrée.",
};
const SUCCESS: Record<string, string> = {
  accepted: "Le joueur a rejoint ton club.",
  rejected: "Candidature refusée.",
  awaiting_player_confirmation: "Acceptée : le joueur doit confirmer son changement de club.",
};

/** Les décisions restent autorisées par api.decide_application, pas par la visibilité des boutons. */
export default async function ManageApplicationsPage({
  params, searchParams,
}: PageProps<"/clubs/[clubId]/manage/applications">) {
  const { clubId } = await params;
  if (!z.uuid().safeParse(clubId).success) notFound();
  const user = await requireOnboardedUser("/clubs/" + clubId + "/manage/applications");
  const [club, requests, search] = await Promise.all([
    getClubDetail(clubId, user.userId), getPendingClubApplications(clubId), searchParams,
  ]);
  if (!club || !club.canManage) notFound();

  const error = typeof search.error === "string" ? ERRORS[search.error] : null;
  const success = typeof search.saved === "string" ? SUCCESS[search.saved] : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-8 pt-4">
      <PageTitle>Candidatures</PageTitle>
      <p className="text-subhead text-ink-2">{club.name} · Réservé aux responsables du club.</p>
      {error ? <InlineStatus kind="error">{error}</InlineStatus> : null}
      {success ? <InlineStatus kind="success">{success}</InlineStatus> : null}
      {requests === null ? (
        <InlineStatus kind="error">Impossible de charger les candidatures. Réessaie.</InlineStatus>
      ) : requests.length === 0 ? (
        <section className="rounded-hero bg-surface-1 p-5">
          <h2 className="text-headline">Aucune candidature en attente</h2>
          <p className="mt-2 text-subhead text-ink-2">Les demandes reçues apparaîtront ici.</p>
        </section>
      ) : (
        <section aria-label="Candidatures en attente" className="flex flex-col gap-3">
          {requests.map(request => (
            <article key={request.id} className="rounded-hero bg-surface-1 p-5">
              <h2 className="text-headline">{request.applicantHandle || "Profil indisponible"}</h2>
              <p className="mt-2 whitespace-pre-wrap text-subhead text-ink-2">
                {request.message || "Aucun message joint."}
              </p>
              <p className="mt-3 text-footnote text-ink-3">
                Demande reçue le {new Date(request.createdAt).toLocaleDateString("fr-FR")}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {(["reject", "accept"] as const).map(decision => (
                  <form key={decision} action={decideApplicationAction}>
                    <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                    <input type="hidden" name="applicationId" value={request.id} />
                    <input type="hidden" name="clubId" value={club.id} />
                    <input type="hidden" name="decision" value={decision} />
                    <SubmitButton variant={decision === "reject" ? "secondary" : "primary"}
                      pendingLabel="Traitement…">
                      {decision === "reject" ? "Refuser" : "Accepter"}
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
