import { cn } from "@/lib/utils";

/** État vide (cahier UX §12) : expliquer la cause, proposer une action utile. Aucun contenu fictif. */
export function EmptyState({ icon, title, description, action, className }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <section role="status" data-state="empty" className={cn("flex flex-col items-center gap-3 rounded-hero bg-surface-1 px-6 py-10 text-center", className)}>
      {icon ? <div aria-hidden className="flex size-14 items-center justify-center rounded-full bg-surface-2 text-ink-2 [&_svg]:size-7">{icon}</div> : null}
      <h2 className="text-headline text-ink">{title}</h2>
      {description ? <p className="max-w-xs text-subhead text-ink-2">{description}</p> : null}
      {action ? <div className="w-full pt-2">{action}</div> : null}
    </section>
  );
}
