"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";

/** Démonstration (galerie) : deux sheets ; ouvrir la seconde ferme la première (jamais d'empilement). */
export function GallerySheets() {
  const [first, setFirst] = useState(false);
  const [second, setSecond] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" onClick={() => setFirst(true)}>
        Ouvrir la fiche A
      </Button>
      <Sheet open={first} onOpenChange={setFirst} title="Fiche A" description="Exemple de panneau inférieur." closeLabel="Fermer">
        <div className="flex flex-col gap-3">
          <TextField label="Champ d'exemple" />
          <Button variant="secondary" onClick={() => setSecond(true)}>
            Ouvrir la fiche B
          </Button>
        </div>
      </Sheet>
      <Sheet open={second} onOpenChange={setSecond} title="Fiche B" closeLabel="Fermer">
        <p className="text-body text-ink-2">Une seule fiche à la fois : la fiche A s&apos;est fermée.</p>
      </Sheet>
    </div>
  );
}
