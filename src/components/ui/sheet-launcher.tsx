"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonClasses, type ButtonVariant } from "./button";
import { listRowClasses, ListRowContent } from "./list";
import { Sheet } from "./sheet";

type Trigger =
  | { kind: "row"; label: React.ReactNode; detail?: React.ReactNode; value?: React.ReactNode; icon?: React.ReactNode; tone?: "default" | "destructive" | "accent" }
  | { kind: "button"; label: React.ReactNode; variant?: ButtonVariant; size?: "md" | "lg" };

/**
 * Déclencheur + sheet, utilisable depuis une page serveur : le contenu (formulaire à Server Action)
 * reste rendu côté serveur et passé en enfant. La sheet se referme quand l'URL change
 * (ex. retour `?saved=` après enregistrement confirmé par le serveur).
 */
export function SheetLauncher({ trigger, title, description, closeLabel, children, testId }: { trigger: Trigger; title: string; description?: string; closeLabel: string; children: React.ReactNode; testId?: string }) {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const key = params.toString();
  const previous = useRef(key);

  useEffect(() => {
    if (previous.current !== key) {
      previous.current = key;
      setOpen(false);
    }
  }, [key]);

  return (
    <>
      {trigger.kind === "row" ? (
        <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={listRowClasses} data-testid={testId}>
          <ListRowContent chevron icon={trigger.icon} label={trigger.label} detail={trigger.detail} value={trigger.value} tone={trigger.tone} />
        </button>
      ) : (
        <button type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={cn(buttonClasses({ variant: trigger.variant, size: trigger.size }))} data-testid={testId}>
          {trigger.label}
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen} title={title} description={description} closeLabel={closeLabel}>
        {children}
      </Sheet>
    </>
  );
}
