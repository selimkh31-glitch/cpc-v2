import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ClubMonogram } from "@/components/ui/club-monogram";
import { Chip } from "@/components/ui/chip";
import type { ClubSummary } from "@/features/clubs/contract";

const platformLabel = { ps5: "PS5", xbox_series: "Xbox Series", pc: "PC" } as const;
const levelLabel = { casual: "Loisir", intermediate: "Intermédiaire", competitive: "Compétitif", elite: "Élite" } as const;

/** Carte compacte : exclusivement des données vérifiées côté serveur, niveau toujours déclaré. */
export function ClubCard({ club, href }: { club: ClubSummary; href?: string }) {
  return (
    <article className="rounded-hero bg-surface-1 p-4">
      <Link href={href ?? "/clubs/" + club.id} className="block rounded-field focus-visible:outline-2 focus-visible:outline-accent">
        <div className="flex items-start gap-3">
          <ClubMonogram name={club.name} size="sm" />
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 text-headline">{club.name}</h2>
            <p className="mt-1 text-footnote text-ink-2">
              {platformLabel[club.platform]} · {club.languages.map((x) => x.toUpperCase()).join(", ")} · {levelLabel[club.level]} (déclaré)
            </p>
          </div>
          <ChevronRight aria-hidden className="mt-2 size-5 shrink-0 text-ink-3" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone={club.recruiting_open ? "accent" : "neutral"}>{club.recruiting_open ? "Recrute" : "Recrutement fermé"}</Badge>
          {club.viewer_is_member ? <Badge>Ton club</Badge> : null}
          <span className="text-footnote text-ink-2">{club.member_count} {club.member_count > 1 ? "membres" : "membre"}</span>
        </div>
        {club.recruiting_positions.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Postes recherchés">
            {club.recruiting_positions.slice(0, 3).map((pos) => <Chip key={pos}>{pos}</Chip>)}
            {club.recruiting_positions.length > 3 ? <Chip>+{club.recruiting_positions.length - 3}</Chip> : null}
          </div>
        ) : null}
      </Link>
    </article>
  );
}
