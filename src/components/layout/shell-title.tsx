"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type ShellTitle = { compact: string | null; setCompact: (title: string | null) => void };
const Ctx = createContext<ShellTitle>({ compact: null, setCompact: () => {} });

/** Partage du titre compact entre le grand titre de l'écran et l'en-tête (style iOS). */
export function ShellTitleProvider({ children }: { children: React.ReactNode }) {
  const [compact, setCompact] = useState<string | null>(null);
  return <Ctx.Provider value={{ compact, setCompact }}>{children}</Ctx.Provider>;
}

export function useShellTitle() {
  return useContext(Ctx).compact;
}

/**
 * Grand titre d'écran (`text-large-title`, seul h1 de la page). Quand il sort de la vue, son texte
 * apparaît en titre compact dans l'en-tête (IntersectionObserver, aucun écouteur de défilement).
 */
export function PageTitle({ children, className }: { children: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const { setCompact } = useContext(Ctx);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // La marge haute exclut la zone de l'en-tête (44 px + encoche) : le titre est « caché » dès qu'il passe dessous.
    const observer = new IntersectionObserver(([entry]) => setCompact(entry && !entry.isIntersecting ? children : null), {
      rootMargin: "-96px 0px 0px 0px",
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      setCompact(null);
    };
  }, [children, setCompact]);

  return (
    <h1 ref={ref} className={["px-1 text-large-title", className].filter(Boolean).join(" ")}>
      {children}
    </h1>
  );
}
