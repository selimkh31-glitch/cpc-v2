"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Action serveur en attente (cahier UX §12) : bouton désactivé et libellé « en cours » jusqu'à la
 * réponse du serveur — aucune confirmation prématurée, pas de double soumission.
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
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={cn("min-h-11 rounded-card px-4 disabled:opacity-60", className)}>
      {pending ? pendingLabel : children}
    </button>
  );
}
