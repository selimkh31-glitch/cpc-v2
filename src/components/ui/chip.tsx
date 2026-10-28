import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pastille d'information (postes, plateforme, filtres). Effaçable seulement si `onRemove` est fourni. */
export function Chip({ children, selected, className }: { children: React.ReactNode; selected?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-caption",
        selected ? "bg-accent text-on-accent" : "bg-surface-2 text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RemovableChip({ children, removeLabel, onRemove }: { children: React.ReactNode; removeLabel: string; onRemove: () => void }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-1 rounded-full bg-surface-2 pl-3 text-caption text-ink">
      {children}
      <button type="button" aria-label={removeLabel} onClick={onRemove} className="inline-flex size-8 items-center justify-center rounded-full active:bg-surface-3">
        <X aria-hidden className="size-3.5" />
      </button>
    </span>
  );
}
