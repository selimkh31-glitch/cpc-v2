import { cn } from "@/lib/utils";

const sizes = { 32: "size-8 text-caption", 48: "size-12 text-subhead", 96: "size-24 text-title-2" } as const;

/**
 * Avatar : URL signée privée (ADR-0015) en <img> simple — jamais next/image, qui la mettrait en cache
 * côté serveur — ou monogramme à partir du pseudo.
 */
export function Avatar({ src, alt, fallback, size = 48, className, testId }: { src?: string | null; alt: string; fallback: string; size?: keyof typeof sizes; className?: string; testId?: string }) {
  const box = cn("shrink-0 rounded-full", sizes[size], className);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} width={size} height={size} className={cn(box, "object-cover")} data-testid={testId} />;
  }
  return (
    <span aria-hidden className={cn(box, "inline-flex items-center justify-center bg-surface-3 font-semibold uppercase text-ink-2")}>
      {fallback.slice(0, 2)}
    </span>
  );
}
