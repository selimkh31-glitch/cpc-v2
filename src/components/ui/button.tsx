"use client";

import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { useSubmitLock } from "./use-submit-lock";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 font-semibold transition-[transform,background-color,opacity] duration-150 ease-out-soft " +
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent",
  secondary: "bg-surface-2 text-ink active:bg-surface-3",
  ghost: "bg-transparent text-accent active:bg-surface-2",
  destructive: "bg-surface-2 text-danger active:bg-surface-3",
};

const sizes: Record<ButtonSize, string> = {
  md: "min-h-11 rounded-field px-4 text-body",
  lg: "min-h-13 w-full rounded-row px-5 text-headline",
};

export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

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
