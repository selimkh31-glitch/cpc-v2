import Link from "next/link";
import { cn } from "@/lib/utils";

export type Segment = { href: string; label: string; active: boolean };

/** Navigation par intention : chaque segment est un vrai lien, avec état annoncé. */
export function SegmentedControl({
  items,
  label,
  className,
}: {
  items: readonly Segment[];
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn("grid min-h-12 grid-flow-col gap-1 rounded-row bg-surface-2 p-1", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex min-h-11 min-w-0 items-center justify-center rounded-field px-3 text-center text-subhead font-semibold transition-colors",
            "focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none",
            item.active ? "bg-surface-1 text-ink shadow-sm" : "text-ink-2 active:bg-surface-3",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
