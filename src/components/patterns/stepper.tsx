import { cn } from "@/lib/utils";

/** Étapes courtes, compatibles lecteur d'écran (étape courante annoncée). */
export function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <nav aria-label="Progression">
      <ol className="flex gap-2">
        {steps.map((step, index) => (
          <li key={step} aria-current={index === current ? "step" : undefined} className="min-w-0 flex-1">
            <div className={cn("h-1.5 rounded-full", index <= current ? "bg-accent" : "bg-surface-3")} aria-hidden />
            <p className={cn("mt-2 truncate text-caption", index === current ? "font-semibold text-ink" : "text-ink-3")}>
              {index + 1}. {step}
            </p>
          </li>
        ))}
      </ol>
    </nav>
  );
}
