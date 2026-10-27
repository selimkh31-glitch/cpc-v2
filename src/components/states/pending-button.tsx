"use client";

import { cn } from "@/lib/utils";
import { useSubmitLock } from "@/components/ui/use-submit-lock";

/**
 * Action serveur en attente (cahier UX §12) : bouton désactivé et libellé « en cours » jusqu'à la
 * réponse du serveur — aucune confirmation prématurée, pas de double soumission (verrou A-3).
 * Écrans Phase 1 : remplacé par `SubmitButton` (design system P2-A) au fil des PR A3/A4.
 */
export function PendingButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending, onClick } = useSubmitLock();
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      data-pending={pending ? "true" : undefined}
      className={cn("min-h-11 rounded-card px-4 disabled:opacity-60", className)}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
