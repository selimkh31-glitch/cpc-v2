import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type InlineStatusKind = "success" | "error" | "info";

/**
 * Retour d'action (confirmé serveur) ou erreur. Les erreurs sont annoncées (role="alert"), le reste
 * est informatif (role="status"). L'icône et le texte portent le sens, pas seulement la couleur.
 */
export function InlineStatus({ kind, children, className }: { kind: InlineStatusKind; children: React.ReactNode; className?: string }) {
  const Icon = kind === "success" ? CircleCheck : kind === "error" ? CircleAlert : Info;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      data-status={kind}
      className={cn(
        "flex items-start gap-3 rounded-row bg-surface-1 px-4 py-3 text-subhead",
        kind === "error" ? "text-danger" : kind === "success" ? "text-ink" : "text-ink-2",
        className,
      )}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", kind === "success" && "text-accent")} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
