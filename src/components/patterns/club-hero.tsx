import { ClubMonogram } from "@/components/ui/club-monogram";
import { Badge } from "@/components/ui/badge";

export function ClubHero({
  name, description, platform, recruitingOpen, level,
}: {
  name: string;
  description?: string | null;
  platform: string;
  recruitingOpen: boolean;
  level: string;
}) {
  return (
    <section className="rounded-hero bg-surface-1 p-5" aria-labelledby="club-title">
      <div className="flex items-center gap-4">
        <ClubMonogram name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 id="club-title" className="break-words text-title-2">{name}</h1>
          <p className="mt-1 text-footnote text-ink-2">{platform} · Niveau {level} (déclaré)</p>
          <div className="mt-2">
            <Badge tone={recruitingOpen ? "accent" : "neutral"}>{recruitingOpen ? "Recrute" : "Recrutement fermé"}</Badge>
          </div>
        </div>
      </div>
      {description ? <p className="mt-4 whitespace-pre-wrap break-words text-body text-ink-2">{description}</p> : null}
    </section>
  );
}
