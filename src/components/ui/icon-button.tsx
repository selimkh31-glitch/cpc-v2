import { cn } from "@/lib/utils";

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  /** Obligatoire : un bouton-icône n'a pas de texte visible. */
  "aria-label": string;
  tone?: "default" | "accent";
};

/** Bouton-icône 44 × 44 (cible tactile minimale, docs/23 §4.1). */
export function IconButton({ className, tone = "default", type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-[transform,background-color] duration-150 ease-out-soft active:scale-95 active:bg-surface-3",
        tone === "accent" ? "text-accent" : "text-ink",
        "[&_svg]:size-[1.375rem]",
        className,
      )}
      {...props}
    />
  );
}
