import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings2 } from "lucide-react";
import { ClubHero } from "@/components/patterns/club-hero";
import { ClubRoster } from "@/features/clubs/components/club-roster";
import { getClubForViewer } from "@/features/clubs/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { requireOnboardedUser } from "@/lib/auth/session";

export default async function ClubPage({ params, searchParams }: PageProps<"/clubs/[clubId]">) {
  const { clubId } = await params;
  const user = await requireOnboardedUser("/clubs/" + encodeURIComponent(clubId));
  const club = await getClubForViewer(clubId, user.userId);
  if (!club) notFound();
  const query = await searchParams;
  const saved = query.created === "1" || query.updated === "1";
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <Link href="/explore" className="min-h-11 w-fit text-subhead text-ink-2">Retour à Explorer</Link>
      {saved ? <p role="status" className="rounded-field bg-surface-2 px-4 py-3 text-subhead text-accent">Club enregistré.</p> : null}
      <ClubHero name={club.name} description={club.description} platform={club.platform.toUpperCase()}
        level={club.level} recruitingOpen={club.recruitingOpen} />
      <section aria-label="Informations du club" className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {club.languages.map((l) => <Chip key={l}>{l.toUpperCase()}</Chip>)}
          {club.viewerIsMember ? <Badge>Ton club</Badge> : null}
        </div>
        {club.recruitingPositions.length ? (
          <div className="flex flex-col gap-2">
            <h2 className="px-1 text-footnote uppercase text-ink-3">Postes recherchés</h2>
            <div className="flex flex-wrap gap-2">
              {club.recruitingPositions.map((p) => <Chip key={p}>{p}</Chip>)}
            </div>
          </div>
        ) : null}
      </section>
      {club.canManage ? (
        <Button asChild variant="secondary" size="lg">
          <Link href={"/clubs/" + club.id + "/manage/settings"}><Settings2 aria-hidden className="mr-2 inline size-5" /> Gérer le recrutement</Link>
        </Button>
      ) : null}
      <section aria-label="Effectif du club" className="flex flex-col gap-3">
        <h2 className="px-4 text-footnote uppercase tracking-wide text-ink-3">Effectif ({club.members.length})</h2>
        <ClubRoster members={club.members} />
      </section>
    </main>
  );
}
