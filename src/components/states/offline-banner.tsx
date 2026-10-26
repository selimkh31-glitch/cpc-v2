"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

/** Hors ligne (cahier UX §12) : bandeau explicite ; la saisie en cours n'est jamais effacée. */
export function OfflineBanner() {
  const t = useTranslations("states");
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" data-state="offline" className="sticky top-0 z-50 bg-foreground px-4 py-2 text-center text-sm text-background">
      {t("offline")}
    </div>
  );
}
