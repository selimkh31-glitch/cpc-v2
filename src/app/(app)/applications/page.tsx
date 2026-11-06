import Link from "next/link";
import { PageTitle } from "@/components/layout/shell-title";
import { Button, SubmitButton } from "@/components/ui/button";
import { InlineStatus } from "@/components/ui/inline-status";
import { getActiveSecondaryMembership, getOwnClubApplications } from "@/features/recruitment/queries";
import { withdrawApplicationAction, confirmMembershipReplacementAction } from "@/features/recruitment/actions";
import { requireOnboardedUser } from "@/lib/auth/session";

const STATES: Record<string, string> = {
  pending: "En attente de décision",
  awaiting_player_confirmation: "Acceptée : confirmation nécessaire",
  accepted: "Acceptée",
  rejected: "Refusée",
  withdrawn: "Retirée",
  expired: "Expirée",
};
const ERRORS: Record<string, string> = {
  VALIDATION: "Vérifie ton choix avant de confirmer.",
  OWNER_MUST_TRANSFER: "Tu dois transférer la propriété du club secondaire avant de le quitter.",
  CONSENT_REQUIRED: "Confirme explicitement la perte de ton rôle manager.",
  EXPIRED: "Cette candidature a expiré.",
  CONFLICT: "Tes affiliations ont changé. Recharge la page.",
  ALREADY_HANDLED: "Cette candidature a déjà été traitée.",
  NOT_FOUND: "Candidature indisponible.",
  UNKNOWN: "Impossible de traiter cette demande.",
};

export default async function MyApplicationsPage({ searchParams }: PageProps<"/applications">) {
  const user = await requireOnboardedUser("/applications");
  const [applications, secondary, search] = await Promise.all([
    getOwnClubApplications(user.userId), getActiveSecondaryMembership(user.userId), searchParams,
  ]);
  const error = typeof search.error === "string" ? ERRORS[search.error] : null;
  const saved = search.saved === "accepted" || search.application === "withdrawn";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-8 pt-4">
      <PageTitle>Mes candidatures</PageTitle>
      {error ? <InlineStatus kind="error">{error}</InlineStatus> : null}
      {saved ? <InlineStatus kind="success">Ta demande a été enregistrée.</InlineStatus> : null}
      {applications === null ? (
        <InlineStatus kind="error">Impossible de charger tes candidatures.</InlineStatus>
      ) : applications.length === 0 ? (
        <section className="rounded-hero bg-surface-1 p-5">
          <h2 className="text-headline">Aucune candidature envoyée</h2>
          <Button asChild variant="secondary" size="lg">
            <Link href="/explore/clubs">Explorer les clubs</Link>
          </Button>
        </section>
      ) : (
        <section aria-label="Historique des candidatures" className="flex flex-col gap-3">
          {applications.map(app => {
            const expired = new Date(app.expiresAt).getTime() <= Date.now();
            const status = expired && (app.status === "pending" || app.status === "awaiting_player_confirmation")
              ? "expired" : app.status;
            const awaiting = status === "awaiting_player_confirmation";
            return (
              <article key={app.id} className="rounded-hero bg-surface-1 p-5">
                <h2 className="text-headline">{app.clubName || "Club indisponible"}</h2>
                <p className="mt-2 text-subhead text-ink-2">{STATES[status]}</p>
                {app.clubName ? (
                  <Link className="mt-2 inline-flex min-h-11 items-center text-subhead text-ink underline-offset-4 hover:underline"
                    href={"/clubs/" + app.clubId}>Consulter le club</Link>
                ) : null}
                {status === "pending" ? (
                  <form action={withdrawApplicationAction} className="mt-3">
                    <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                    <input type="hidden" name="applicationId" value={app.id} />
                    <input type="hidden" name="clubId" value={app.clubId} />
                    <SubmitButton variant="secondary" pendingLabel="Retrait…">Retirer ma candidature</SubmitButton>
                  </form>
                ) : null}
                {awaiting ? (
                  <div className="mt-3 flex flex-col gap-3">
                    <p className="text-subhead text-ink-2">
                      Tu as déjà deux clubs. Pour rejoindre ce club, tu dois confirmer le remplacement de ton SECONDARY.
                      Ton club principal ne sera pas modifié.
                    </p>
                    {!secondary ? <InlineStatus kind="error">Aucun club secondaire disponible. Recharge la page.</InlineStatus>
                      : secondary.role === "owner" ? (
                        <InlineStatus kind="error">
                          Tu es propriétaire de {secondary.clubName || "ton club secondaire"}.
                          Tu dois d'abord transférer la propriété avant tout remplacement.
                        </InlineStatus>
                      ) : (
                        <form action={confirmMembershipReplacementAction} className="flex flex-col gap-3">
                          <input type="hidden" name="requestId" value={crypto.randomUUID()} />
                          <input type="hidden" name="applicationId" value={app.id} />
                          <input type="hidden" name="replaceMembershipId" value={secondary.id} />
                          <p className="text-subhead text-ink">
                            Club secondaire remplacé : {secondary.clubName || "Club indisponible"}
                          </p>
                          {secondary.role === "manager" ? (
                            <label className="flex min-h-11 items-start gap-3 text-subhead text-ink-2">
                              <input type="checkbox" name="acknowledgeManagerRoleLoss" value="true"
                                required className="mt-1 size-5 shrink-0 accent-current" />
                              Je comprends que je perdrai mon rôle de manager dans ce club.
                            </label>
                          ) : null}
                          <SubmitButton size="lg" pendingLabel="Confirmation…">
                            Confirmer le remplacement
                          </SubmitButton>
                        </form>
                      )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
