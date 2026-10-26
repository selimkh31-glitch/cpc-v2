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
    <section
      role={urgent ? "alert" : "status"}
      data-state={kind}
      className={cn("flex flex-col gap-2 rounded-card border border-foreground/15 p-4", urgent && "border-red-500", className)}
    >
      <h2 className="font-medium">{title}</h2>
      {description ? <p className="text-sm opacity-80">{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </section>
  );
}
