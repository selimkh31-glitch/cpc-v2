"use client";

import { Sheet } from "@/components/ui/sheet";

/** Panneau accessible, fermé sans modifier les filtres tant que l'utilisateur n'applique pas. */
export function FilterSheet({
  open, onOpenChange, children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filtres de clubs"
      description="Affiner les résultats"
      closeLabel="Fermer les filtres"
    >
      {children}
    </Sheet>
  );
}
