"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Action serveur en attente (cahier UX §12) : bouton désactivé et libellé « en cours » jusqu'à la
 * réponse du serveur — aucune confirmation prématurée, pas de double soumission.
 *
 * QA iPhone A-3 : `disabled` ne suffit pas seul. Entre le premier appui et le rendu où `pending`
 * devient vrai, un second appui (ou la touche Entrée, qui déclenche un clic sur le bouton par défaut
 * du formulaire) pouvait relancer l'action : 14 connexions en 9 s observées sur la Preview.
 * Un verrou synchrone (ref) bloque tout envoi supplémentaire jusqu'à la fin de l'action en cours.
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
  const locked = useRef(false);
  const wasPending = useRef(false);

  useEffect(() => {
    // Déverrouillage uniquement après une action réellement démarrée puis terminée (erreur affichée,
    // formulaire réutilisable). Une redirection réussie démonte simplement le composant.
    if (pending) wasPending.current = true;
    else if (wasPending.current) {
      wasPending.current = false;
      locked.current = false;
    }
  }, [pending]);

  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (locked.current || pending) {
      event.preventDefault();
      return;
    }
    // Laisse la validation native du formulaire décider : un formulaire invalide n'est pas envoyé
    // et ne doit pas verrouiller le bouton.
    if (event.currentTarget.form && !event.currentTarget.form.checkValidity()) return;
    locked.current = true;
    // Filet de sécurité : si l'action n'a jamais démarré (envoi annulé par le navigateur),
    // le bouton ne reste pas bloqué indéfiniment.
    window.setTimeout(() => {
      if (!wasPending.current) locked.current = false;
    }, 3000);
  };

  const busy = pending;
  return (
    <button
      type="submit"
      onClick={onClick}
      disabled={busy}
      aria-disabled={busy}
      aria-busy={busy}
      data-pending={busy ? "true" : undefined}
      className={cn("min-h-11 rounded-card px-4 disabled:opacity-60", className)}
    >
      {busy ? pendingLabel : children}
    </button>
  );
}
