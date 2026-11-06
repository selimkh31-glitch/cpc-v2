import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageTitle } from "@/components/layout/shell-title";
import { ClubHero } from "@/components/patterns/club-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InlineStatus } from "@/components/ui/inline-status";
import { getClubDetail } from "@/features/clubs/queries";
import { POSITION_GROUPS } from "@/features/onboarding/referentials";
import { requireOnboardedUser } from "@/lib/auth/session";

const PLAT: Record<string, string> = { ps5: "PS5", xbox_series: "Xbox Series", pc: "PC" };
const LEVEL: Record<string, string> = { casual: "Loisir", intermediate: "Intermédiaire", competitive: "Compétitif", elite: "Élite" };

export default async function ClubDetailPage({ params, searchParams }: PageProps<"/clubs/[clubId]">) {
  const { clubId } = await params;
  if (!z.uuid().safeParse(clubId).success) notFound();
  const user = await requireOnboardedUser("/clubs/" + clubId);
  const [club, search] = await Promise.all([getClubDetail(clubId, user.userId), searchParams]);
  if (!club) notFound();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <PageTitle>Club</PageTitle>
      {search.saved === "settings" ? <InlineStatus kind="success">Réglages du club enregistrés.</InlineStatus> : null}
      <ClubHero name={club.name} platform={PLAT[club.platform] ?? club.platform}
        level={LEVEL[club.level] ?? club.level} recruitingOpen={club.recruitingOpen} />
      <section aria-label="Présentation" className="rounded-hero bg-surface-1 p-5">
        <h2 className="text-headline">À propos du club</h2>
        <p className="mt-2 whitespace-pre-line text-subhead text-ink-2">{club.description || "Aucune présentation renseignée."}</p>
        <p className="mt-3 text-footnote text-ink-3">Langues : {club.languages.map((l) => l.toUpperCase()).join(", ")}</p>
      </section>
      <section aria-label="Recrutement" className="rounded-hero bg-surface-1 p-5">
        <h2 className="text-headline">Postes recherchés</h2>
        {club.recruitingPositions.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {club.recruitingPositions.map((position) => <Chip key={position}>{position}</Chip>)}
          </div>
        ) : <p className="mt-2 text-subhead text-ink-2">Aucun poste recherché actuellement.</p>}
      </section>
      <section aria-label="Effectif" className="flex flex-col gap-3">
        <h2 className="px-1 text-headline">Effectif · {club.members.length} {club.members.length > 1 ? "joueurs" : "joueur"}</h2>
        {POSITION_GROUPS.map((group) => {
          const players = club.members.filter((member) =>
            group.positions.some((position) => position === member.position));
          if (!players.length) return null;
          return (
            <div key={group.key} className="rounded-hero bg-surface-1 p-4">
              <h3 className="mb-3 text-footnote font-semibold uppercase tracking-wide text-ink-3">{group.key}</h3>
              <ul className="flex flex-col gap-2">
                {players.map((player) => (
                  <li key={player.profileId} className="flex min-h-11 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-subhead text-ink">{player.handle ?? "Profil indisponible"}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {player.role !== "member" ? <Badge>{player.role === "owner" ? "OWNER" : "Manager"}</Badge> : null}
                      <Chip>{player.position}</Chip>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
      {club.canManage ? (
        <Button asChild size="lg" variant="secondary">
          <Link href={"/clubs/" + club.id + "/manage/settings"}>Gérer le recrutement</Link>
        </Button>
      ) : null}
      <p className="text-center text-footnote text-ink-3">Les candidatures seront disponibles avec le parcours de recrutement.</p>
    </main>
  );
}
