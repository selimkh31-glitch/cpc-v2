"use client";

/** Dernier recours (erreur dans la mise en page racine) : textes statiques, aucune dépendance. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <main role="alert">
          <h1>Une erreur est survenue</h1>
          <p>L&apos;application n&apos;a pas pu s&apos;afficher. Réessaie dans un instant.</p>
          <button type="button" onClick={reset} style={{ minHeight: 44, padding: "0 1rem" }}>
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
