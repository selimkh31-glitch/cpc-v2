"use client";

import { useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Onboarding en étapes (docs/23 §4.3) : un seul <form>, un seul envoi final. Les étapes non affichées
 * restent dans le DOM (attribut `hidden`), donc toutes les valeurs partent à l'envoi ; « Continuer »
 * vérifie les champs de l'étape courante (validation native), le serveur revalide tout.
 */
export function OnboardingStepper({
  steps,
  labels,
}: {
  steps: { title: string; content: React.ReactNode }[];
  labels: { next: string; back: string; progress: string[] };
}) {
  const [index, setIndex] = useState(0);
  const containers = useRef<(HTMLDivElement | null)[]>([]);

  const goNext = () => {
    const current = containers.current[index];
    const invalid = current?.querySelector<HTMLInputElement | HTMLSelectElement>("input:invalid, select:invalid");
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    setIndex((i) => Math.min(i + 1, steps.length - 1));
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-footnote text-ink-3" aria-live="polite">{labels.progress[index]}</p>
        <div aria-hidden className="grid gap-1.5">
          <div className="flex gap-1.5">
            {steps.map((step, i) => (
              <span key={step.title} className={i <= index ? "h-1 flex-1 rounded-full bg-accent" : "h-1 flex-1 rounded-full bg-surface-3"} />
            ))}
          </div>
        </div>
        <h2 className="text-title-2">{steps[index]?.title}</h2>
      </div>

      {steps.map((step, i) => (
        <div key={step.title} ref={(el) => { containers.current[i] = el; }} hidden={i !== index} className="flex flex-col gap-6">
          {step.content}
        </div>
      ))}

      {index < steps.length - 1 ? (
        <Button size="lg" onClick={goNext}>
          {labels.next}
        </Button>
      ) : null}
      {index > 0 ? (
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(i - 1, 0))} className="self-center">
          <ChevronLeft aria-hidden className="size-5" />
          {labels.back}
        </Button>
      ) : null}
    </div>
  );
}
