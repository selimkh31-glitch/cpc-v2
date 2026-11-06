import { cn } from "@/lib/utils";

/** Ligne de filtres courts, défilable horizontalement, accessible au clavier. */
export function FilterBar({
  label = "Filtres de recherche",
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("flex min-h-11 gap-2 overflow-x-auto pb-1", className)}>
      {children}
    </div>
  );
}
