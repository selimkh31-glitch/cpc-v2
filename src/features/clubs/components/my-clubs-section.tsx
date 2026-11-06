import Link from "next/link";
import { Building2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListRow, ListSection } from "@/components/ui/list";
import type { MyClub } from "@/features/clubs/queries";

/** Mes clubs : reflète les affiliations PRIMARY/SECONDARY, jamais des clubs simulés. */
export function MyClubsSection({ clubs }: { clubs: MyClub[] }) {
  return (
    <div className="flex flex-col gap-3">
      <ListSection title="Mes clubs" footer="Un joueur peut appartenir à deux clubs maximum.">
        {clubs.map((club) => (
          <ListRow key={club.clubId} href={"/clubs/" + club.clubId} icon={<Building2 />} label={club.name}
            detail={club.slot === "primary" ? "Club principal" : "Club secondaire"}
            value={club.role === "owner" ? "OWNER" : club.role === "manager" ? "Manager" : "Membre"} />
        ))}
        {!clubs.length ? <ListRow label="Tu n'appartiens encore à aucun club." /> : null}
      </ListSection>
      {clubs.length < 2 ? (
        <Button asChild variant="secondary" size="lg">
          <Link href="/clubs/new"><PlusCircle aria-hidden className="size-5" />Créer un club</Link>
        </Button>
      ) : null}
    </div>
  );
}
