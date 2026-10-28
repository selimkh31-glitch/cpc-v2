"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

/**
 * Verrou d'envoi unique d'un formulaire à Server Action (QA iPhone A-3, docs/21).
 * `disabled` ne suffit pas seul : entre le premier appui et le rendu où `pending` devient vrai,
 * un second appui (ou la touche Entrée, qui clique le bouton par défaut) relancerait l'action.
 * Le verrou synchrone bloque tout envoi supplémentaire jusqu'à la fin de l'action en cours.
 */
export function useSubmitLock() {
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
    // Un formulaire invalide n'est pas envoyé et ne doit pas verrouiller le bouton.
    if (event.currentTarget.form && !event.currentTarget.form.checkValidity()) return;
    locked.current = true;
    // Filet de sécurité : si l'action n'a jamais démarré, le bouton ne reste pas bloqué.
    window.setTimeout(() => {
      if (!wasPending.current) locked.current = false;
    }, 3000);
  };

  return { pending, onClick };
}
