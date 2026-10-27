import { cn } from "@/lib/utils";

/** Statut court (« déclaré », « provisoire ») ou compteur. Le sens ne repose jamais sur la seule couleur. */
export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "accent" | "danger"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-5 items-center rounded-full px-2 text-caption",
        tone === "neutral" && "bg-surface-3 text-ink-2",
        tone === "accent" && "bg-accent text-on-accent",
        tone === "danger" && "bg-danger text-canvas",
        className,
      )}
    >
      {children}
    </span>
  );
}
