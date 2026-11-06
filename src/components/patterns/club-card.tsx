import Link from "next/link";
import { ChevronRight, UsersRound } from "lucide-react";
import { ClubMonogram } from "@/components/ui/club-monogram";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import type { ClubSummary } from "@/features/clubs/contract";
import { cn } from "@/lib/utils";

const PLATFORMS: Record<string, string> = { ps5: "PS5", xbox_series: "Xbox Series", pc: "PC" };
const LEVELS: Record<string, string> = {
  casual: "Loisir", intermediate: "Intermédiaire", competitive: "Compétitif", elite: "Élite",
};

/** Carte reliée exclusivement à ClubSummary réel, sans réputation ni activité fictive. */
export function ClubCard({ club, className }: { club: ClubSummary; className?: string }) {
  return (
    <article className={cn("overflow-hidden rounded-hero bg-surface-1", className)}>
      <Link href={"/clubs/" + encodeURIComponent(club.id)} className="flex min-h-28 items-start gap-3 p-4 active:bg-surface-2">
        <ClubMonogram name={club.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-headline text-ink">{club.name}</h3>
            <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={club.recruiting_open ? "accent" : "neutral"}>
              {club.recruiting_open ? "Recrute" : "Recrutement fermé"}
            </Badge>
            {club.viewer_is_member ? <Badge>Ton club</Badge> : null}
            <span className="text-caption text-ink-2">{PLATFORMS[club.platform]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-footnote text-ink-2">
            <span>{LEVELS[club.level]} · Niveau déclaré</span>
            <span className="inline-flex items-center gap-1"><UsersRound aria-hidden className="size-4" />{club.member_count}</span>
            <span>{club.languages.map((l) => l.toUpperCase()).join(" · ")}</span>
          </div>
          {club.recruiting_positions.length ? (
            <div aria-label="Postes recherchés" className="flex flex-wrap gap-1">
              {club.recruiting_positions.slice(0, 3).map((position) => <Chip key={position}>{position}</Chip>)}
              {club.recruiting_positions.length > 3 ? <Chip>+{club.recruiting_positions.length - 3}</Chip> : null}
            </div>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
