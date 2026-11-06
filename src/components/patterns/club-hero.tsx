import { ClubMonogram } from "@/components/ui/club-monogram";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** En-tête de club ; le niveau reste toujours déclaré et non vérifié. */
export function ClubHero({
  name,
  platform,
  level,
  recruitingOpen,
  className,
}: {
  name: string;
  platform: string;
  level: string;
  recruitingOpen: boolean;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4 rounded-hero bg-surface-1 p-5", className)}>
      <div className="flex items-center gap-4">
        <ClubMonogram name={name} className="size-16 text-title-2" />
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-title-2 text-ink">{name}</h2>
          <p className="mt-1 text-subhead text-ink-2">{platform} · {level} (déclaré)</p>
        </div>
      </div>
      <div><Badge tone={recruitingOpen ? "accent" : "neutral"}>{recruitingOpen ? "Recrutement ouvert" : "Recrutement fermé"}</Badge></div>
    </section>
  );
}
