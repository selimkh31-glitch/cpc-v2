import { Skeleton } from "@/components/ui/skeleton";

export { Skeleton };

/** Chargement d'un écran du shell : grand titre et sections fantômes, annoncés une seule fois. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <main aria-busy="true" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <p role="status" className="sr-only">{label}</p>
      <Skeleton className="h-10 w-44 rounded-field" />
      <Skeleton className="h-36 w-full rounded-hero" />
      <Skeleton className="h-24 w-full" />
    </main>
  );
}
