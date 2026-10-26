import { cn } from "@/lib/utils";

/** Chargement (cahier UX §12) : squelette neutre, annoncé une seule fois aux lecteurs d'écran. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-card bg-foreground/10 motion-reduce:animate-none", className)} />;
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <main aria-busy="true" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <p role="status" className="sr-only">{label}</p>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </main>
  );
}
