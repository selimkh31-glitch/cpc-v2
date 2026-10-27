import { cn } from "@/lib/utils";

export type StateKind = "empty" | "error" | "forbidden" | "expired" | "conflict" | "offline";

/**
 * Panneau d'état transversal (cahier UX §12) : expliquer la cause, proposer une action utile.
 * Les erreurs sont annoncées (role="alert"), les autres états sont informatifs (role="status").
 */
export function StatePanel({
  kind,
  title,
  description,
  action,
  className,
}: {
  kind: StateKind;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const urgent = kind === "error" || kind === "conflict";
  return (
    <section role={urgent ? "alert" : "status"} data-state={kind} className={cn("flex flex-col gap-2 rounded-hero bg-surface-1 p-5", className)}>
      <h2 className={cn("text-headline", urgent ? "text-danger" : "text-ink")}>{title}</h2>
      {description ? <p className="text-subhead text-ink-2">{description}</p> : null}
      {action ? <div className="pt-2">{action}</div> : null}
    </section>
  );
}
