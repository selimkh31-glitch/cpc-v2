"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/states/state-panel";

/** Erreur dans le shell (cahier UX §12) : message concret, réessai, contexte (onglets) conservé. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("states");
  useEffect(() => {
    console.error("[cpc] erreur d'écran", error.digest ?? "");
  }, [error]);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-8 pt-4">
      <StatePanel kind="error" title={t("errorTitle")} description={t("errorBody")} action={<Button size="lg" variant="secondary" onClick={reset}>{t("retry")}</Button>} />
    </main>
  );
}
