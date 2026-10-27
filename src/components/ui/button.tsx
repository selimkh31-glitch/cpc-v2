"use client";

import { Slot } from "@radix-ui/react-slot";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button-styles";
import { useSubmitLock } from "./use-submit-lock";

export type { ButtonSize, ButtonVariant };

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Rend l'enfant (ex. `<Link>`) avec les styles du bouton. */
  asChild?: boolean;
};

/** Bouton du design system (docs/23 §4.1) : ≥ 44 px, retour de pression, focus visible. */
export function Button({ variant, size, asChild, className, type = "button", ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp {...(asChild ? {} : { type })} className={buttonClasses({ variant, size, className })} {...props} />;
}

/**
 * Bouton d'envoi d'un formulaire à Server Action : état « en cours » et envoi unique (verrou A-3).
 * Le libellé en attente est annoncé (aria-busy) ; aucun succès n'est affiché avant la réponse serveur.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant,
  size,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
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
      className={buttonClasses({ variant, size, className })}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
