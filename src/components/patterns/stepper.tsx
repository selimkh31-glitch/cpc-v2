import { cn } from "@/lib/utils";

/** Étapes courtes, sémantiques, sans progression fictive. */
export function Stepper({
  steps,
  current,
  label = "Progression",
}: {
  steps: readonly string[];
  current: number;
  label?: string;
}) {
  return (
    <ol aria-label={label} className="grid grid-flow-col gap-2">
      {steps.map((step, index) => (
        <li key={step} aria-current={index === current ? "step" : undefined}
            className={cn("flex min-w-0 flex-col gap-1.5", index === current ? "text-ink" : "text-ink-3")}>
          <span aria-hidden className={cn(
            "h-1.5 rounded-full",
            index <= current ? "bg-accent" : "bg-surface-3",
          )} />
          <span className="truncate text-center text-caption">{step}</span>
        </li>
      ))}
    </ol>
  );
}
