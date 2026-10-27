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
    <div role="status" data-state="offline" className="sticky top-0 z-50 bg-surface-3 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-footnote text-ink">
      {t("offline")}
    </div>
  );
}
