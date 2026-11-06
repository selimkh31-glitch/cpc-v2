import Link from "next/link";
import { Compass, PlusCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/layout/shell-title";
import { ClubCard } from "@/components/patterns/club-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { LoadMore } from "@/components/ui/load-more";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatePanel } from "@/components/states/state-panel";
import { ClubFiltersControls } from "@/features/explore/components/club-filters-controls";
import { findRealClubs } from "@/features/explore/queries";
import { parseClubFilters, serializeClubFilters } from "@/features/explore/contract";
import { getOwnProfile } from "@/features/profiles/queries";
import { requireOnboardedUser } from "@/lib/auth/session";

/** Explorer Clubs (EXP-02) : aucun club inventé, recherche sous RLS et URL partageable. */
export default async function ExploreClubsPage({ searchParams }: PageProps<"/explore/clubs">) {
  const user = await requireOnboardedUser("/explore/clubs");
  const [profile, raw] = await Promise.all([getOwnProfile(user.userId), searchParams]);
  if (!profile) notFound();

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) value.forEach(v => params.append(key, v));
    else if (typeof value === "string") params.set(key, value);
  }
  const defaults = { platform: profile.platform };
  const filters = parseClubFilters(params, defaults);
  const result = await findRealClubs(filters);

  const nextParams = result.nextCursor
    ? serializeClubFilters({ ...filters, cursor: result.nextCursor }, defaults, { includeCursor: true })
    : null;
  const nextLink = nextParams ? "/explore/clubs?" + nextParams.toString() : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-8 pt-4">
      <PageTitle>Explorer</PageTitle>
      <SegmentedControl
        label="Choisir ce que tu recherches"
        items={[
          { href: "/explore/play", label: "Jouer", active: false },
          { href: "/explore/clubs", label: "Clubs", active: true },
        ]}
      />
      <ClubFiltersControls filters={filters} defaults={defaults} />
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-headline">Clubs</h2>
        <Button variant="secondary" asChild>
          <Link href="/clubs/new"><PlusCircle aria-hidden className="size-4" />Créer</Link>
        </Button>
      </div>
      {result.error ? (
        <StatePanel kind="error" title="Recherche indisponible"
          description="Impossible de charger les clubs pour le moment."
          action={<Button asChild variant="secondary"><Link href="/explore/clubs">Réessayer</Link></Button>} />
      ) : result.clubs.length ? (
        <section aria-label="Clubs trouvés" className="flex flex-col gap-3">
          <p role="status" className="text-footnote text-ink-2">
            {result.clubs.length} {result.clubs.length > 1 ? "clubs affichés" : "club affiché"}
          </p>
          {result.clubs.map(club => <ClubCard key={club.id} club={club} />)}
          <LoadMore href={nextLink} label="Voir les clubs suivants" />
        </section>
      ) : filters.cursor || filters.q || filters.position || filters.languages.length || filters.level || !filters.recruitingOnly || filters.platform !== profile.platform ? (
        <EmptyState icon={<Compass />} title="Aucun club ne correspond à tes filtres"
          description="Essaie une autre recherche ou efface les filtres pour voir les clubs disponibles."
          action={<Button asChild size="lg" variant="secondary"><Link href="/explore/clubs">Effacer les filtres</Link></Button>} />
      ) : (
        <EmptyState icon={<Compass />} title="Aucun club qui recrute sur ta plateforme pour l'instant"
          description="Tu peux consulter tous les clubs ou créer le tien. Aucun résultat n'est inventé."
          action={<Button asChild size="lg"><Link href="/clubs/new">Créer un club</Link></Button>} />
      )}
    </main>
  );
}
