"use client";

import { Sheet } from "@/components/ui/sheet";

/** Panneau unique de filtres ; la soumission est possédée par le formulaire appelant. */
export function FilterSheet({
  open,
  onOpenChange,
  children,
  title = "Filtres des clubs",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} closeLabel="Fermer les filtres">
      <div className="flex flex-col gap-4">{children}</div>
    </Sheet>
  );
}
