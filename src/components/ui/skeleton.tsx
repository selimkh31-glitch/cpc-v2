import { cn } from "@/lib/utils";

/** Chargement : squelette neutre, sans animation si Reduce Motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-row bg-surface-2 motion-reduce:animate-none", className)} />;
}
