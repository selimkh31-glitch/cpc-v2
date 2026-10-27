import { cn } from "@/lib/utils";

/**
 * Choix (radio ou case) présenté en tuile tactile ≥ 44 px. L'input natif couvre toute la tuile
 * (opacité nulle, au premier plan) : clavier, lecteur d'écran et validation native restent ceux du
 * navigateur ; les textes n'interceptent pas le toucher.
 */
export function ChoiceChip({
  type,
  name,
  value,
  label,
  accessibleLabel,
  detail,
  required,
  defaultChecked,
  className,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  label: string;
  accessibleLabel?: string;
  detail?: string;
  required?: boolean;
  defaultChecked?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-11 flex-col items-center justify-center rounded-row bg-surface-2 px-2 py-2 text-center text-ink transition-colors duration-150",
        "has-[:checked]:bg-accent has-[:checked]:text-on-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-canvas",
        className,
      )}
    >
      <input type={type} name={name} value={value} required={required} defaultChecked={defaultChecked} aria-label={accessibleLabel} className="peer absolute inset-0 z-10 size-full cursor-pointer appearance-none rounded-row opacity-0" />
      <span className="pointer-events-none text-headline">{label}</span>
      {detail ? <span className="pointer-events-none text-caption opacity-80">{detail}</span> : null}
    </label>
  );
}
