"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "cpc:sheet-open";

/** Déverrouille le défilement seulement si plus aucune sheet n'est ouverte. */
function releaseScrollLock() {
  if (!document.querySelector("dialog[data-sheet][open]")) document.documentElement.style.overflow = "";
}

/**
 * Panneau inférieur (cahier UX §2) sur l'élément natif <dialog> (showModal) :
 * - modal réel : le reste de la page devient inerte, Échap ferme, focus restitué à la fermeture ;
 * - aucun style en ligne ni <style> injecté (CSP à nonce, ADR-0017) — d'où le choix du natif
 *   plutôt que Radix Dialog, dont le verrou de défilement injecte une balise <style> sans nonce ;
 * - **une seule sheet ouverte** : l'ouverture d'une sheet ferme toute autre sheet (jamais d'empilement).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  closeLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Une seule sheet à la fois : toute autre ouverture ferme celle-ci.
  useEffect(() => {
    const onOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) close();
    };
    window.addEventListener(OPEN_EVENT, onOther);
    return () => window.removeEventListener(OPEN_EVENT, onOther);
  }, [id, close]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
      dialog.showModal();
      // Verrou de défilement par CSSOM (autorisé par la CSP, contrairement à un attribut style).
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, id]);

  useEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
      releaseScrollLock();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-desc` : undefined}
      data-sheet=""
      onClose={() => {
        releaseScrollLock();
        if (open) close();
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      // Tap sur le voile : la cible est le <dialog> lui-même (le panneau intérieur l'occupe sinon).
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className={cn(
        "fixed inset-x-0 bottom-0 top-auto m-0 mx-auto w-full max-w-md max-h-[88dvh] overflow-hidden rounded-t-sheet bg-surface-1 p-0 text-ink",
        "backdrop:bg-black/55 open:animate-[sheet-in_240ms_var(--ease-out-soft)] motion-reduce:animate-none",
        className,
      )}
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-surface-3" />
        <div className="flex items-start gap-3 px-5 pb-2 pt-3">
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="text-headline">{title}</h2>
            {description ? <p id={`${id}-desc`} className="mt-1 text-subhead text-ink-2">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={closeLabel}
            className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-2 active:bg-surface-3"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2">{children}</div>
      </div>
    </dialog>
  );
}
