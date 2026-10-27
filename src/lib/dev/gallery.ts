/**
 * Galerie du design system (docs/23 §5.7) : uniquement si ENABLE_UI_GALLERY=1, et jamais sur Vercel
 * (Preview comprise), même si la variable y était définie par erreur.
 */
export function isUiGalleryEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.ENABLE_UI_GALLERY === "1" && env.VERCEL !== "1";
}
