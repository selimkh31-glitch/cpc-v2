import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/** Deux ou trois filtres fréquents, avec accès au panneau complet. */
export function FilterBar({
  options, moreLabel, onOpenFilters,
}: {
  options: readonly { label: string; href: string; active: boolean }[];
  moreLabel: string;
  onOpenFilters: () => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Filtres rapides">
      {options.map((option) => (
        <Link
          key={option.href + option.label}
          href={option.href}
          aria-current={option.active ? "true" : undefined}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-subhead",
            option.active ? "border-accent bg-surface-2 text-ink" : "border-separator bg-surface-1 text-ink-2",
          )}
        >
          {option.label}
        </Link>
      ))}
      <button
        type="button"
        onClick={onOpenFilters}
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-separator bg-surface-1 px-4 text-subhead text-ink"
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {moreLabel}
      </button>
    </div>
  );
}
