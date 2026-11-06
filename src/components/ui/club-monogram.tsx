import { cn } from "@/lib/utils";

/** Aucun blason inventé : initiales lisibles jusqu'au lot Crest (D-43). */
export function getClubInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "FC";
  return (words.length === 1 ? (words[0] ?? "FC").slice(0, 2) : words.slice(0, 2).map((word) => word.charAt(0)).join(""))
    .toLocaleUpperCase("fr-FR");
}

export function ClubMonogram({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span aria-hidden className={cn(
      "flex size-14 shrink-0 items-center justify-center rounded-card bg-surface-2 text-headline font-bold tracking-tight text-ink",
      className,
    )}>
      {getClubInitials(name)}
    </span>
  );
}
