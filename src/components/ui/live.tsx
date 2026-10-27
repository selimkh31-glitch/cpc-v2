import { cn } from "@/lib/utils";

/**
 * Signalétique LIVE (cahier UX §6 : halo néon perceptible, sans animation envahissante).
 * Réservée aux données LIVE réelles (lots P2-G/P2-H) : en P2-A, visible uniquement dans la galerie.
 * Le sens est porté par le libellé « LIVE », jamais par la seule couleur.
 */
export function LivePill({ label = "LIVE", detail, className }: { label?: string; detail?: string; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full bg-surface-2 px-2.5 text-caption font-semibold text-live-text", className)}>
      <span aria-hidden className="size-2 rounded-full bg-live shadow-[0_0_8px_var(--live)]" />
      {label}
      {detail ? <span className="font-normal tabular-nums text-ink-2">{detail}</span> : null}
    </span>
  );
}

/** Halo LIVE : lueur statique ; une seule pulsation à l'apparition, supprimée en Reduce Motion. */
export function LiveHalo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-hero shadow-[0_0_0_1px_var(--live),0_0_24px_-4px_var(--live)] animate-[live-glow_1.2s_var(--ease-out-soft)_1] motion-reduce:animate-none", className)}>
      {children}
    </div>
  );
}
