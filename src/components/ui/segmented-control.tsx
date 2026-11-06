import Link from "next/link";
import { cn } from "@/lib/utils";

export type Segment = { label: string; href: string; active: boolean };

/** Navigation par intention, sans navigation factice ni état uniquement local. */
export function SegmentedControl({ items, label }: { items: readonly Segment[]; label: string }) {
  return (
    <nav aria-label={label} className="grid min-h-12 grid-flow-col auto-cols-fr gap-1 rounded-row bg-surface-2 p-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex min-h-11 min-w-0 items-center justify-center rounded-field px-2 text-center text-subhead font-medium transition-colors",
            item.active ? "bg-surface-1 text-ink shadow-sm" : "text-ink-2 active:bg-surface-3",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
