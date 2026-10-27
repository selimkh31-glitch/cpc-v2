import { cn } from "@/lib/utils";

/** Styles des boutons, utilisables côté serveur comme côté client (liens stylés en bouton). */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 text-center font-semibold transition-[transform,background-color,opacity] duration-150 ease-out-soft " +
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
