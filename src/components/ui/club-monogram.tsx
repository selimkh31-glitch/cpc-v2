import { cn } from "@/lib/utils";

/** Initiales temporaires, tant que les blasons (D-43) ne sont pas livrés. */
export function clubInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return "?";
  const first = Array.from(words[0] ?? "");
  if (words.length === 1) return first.slice(0, 2).join("").toLocaleUpperCase("fr");
  const last = Array.from(words[words.length - 1] ?? "");
  return ((first[0] ?? "") + (last[0] ?? "")).toLocaleUpperCase("fr");
}

export function ClubMonogram({
  name, size = "md", className,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-card border border-separator bg-surface-2 font-bold tracking-tight text-accent",
        size === "sm" && "size-12 text-headline",
        size === "md" && "size-16 text-title-2",
        size === "lg" && "size-20 text-title-2",
        className,
      )}
    >
      {clubInitials(name)}
    </span>
  );
}
