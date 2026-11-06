import { POSITION_GROUPS, type Position } from "@/features/onboarding/referentials";
import { ListRow, ListSection } from "@/components/ui/list";
import type { ClubMember } from "@/features/clubs/queries";

const titles = { GK: "Gardiens", DEF: "Défenseurs", MID: "Milieux", ATT: "Attaquants" } as const;
const roles = { owner: "Propriétaire", manager: "Manager", member: "Membre" } as const;

/** Roster sans double comptage ; aucune donnée de joueur caché par RLS. */
export function ClubRoster({ members }: { members: readonly ClubMember[] }) {
  return (
    <div className="flex flex-col gap-4" aria-label="Effectif du club">
      {POSITION_GROUPS.map((group) => {
        const rows = members.filter((m) => (group.positions as readonly Position[]).includes(m.mainPosition));
        if (!rows.length) return null;
        return (
          <ListSection key={group.key} title={titles[group.key]}>
            {rows.map((m) => (
              <ListRow key={m.profileId} label={m.handle}
                detail={m.mainPosition + " · " + roles[m.role] + " · " + (m.slot === "primary" ? "Club principal" : "Club secondaire")} />
            ))}
          </ListSection>
        );
      })}
      {!members.length ? <p className="px-4 text-subhead text-ink-2">L’effectif n’est pas disponible.</p> : null}
    </div>
  );
}
