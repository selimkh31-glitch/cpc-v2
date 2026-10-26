"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { StatePanel } from "@/components/states/state-panel";

/** Erreur dans le shell (cahier UX §12) : message concret, réessai, contexte (onglets) conservé. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("states");
  useEffect(() => {
    console.error("[cpc] erreur d'écran", error.digest ?? "");
  }, [error]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-6">
      <StatePanel
        kind="error"
        title={t("errorTitle")}
        description={t("errorBody")}
        action={
          <button type="button" onClick={reset} className="min-h-11 rounded-card border px-4">
            {t("retry")}
          </button>
        }
      />
    </main>
  );
}
