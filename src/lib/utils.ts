import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doit connaître l'échelle typographique du design system (docs/23 §2.2) : sans cela,
 * `text-headline` est pris pour une couleur et efface `text-on-accent` (contraste cassé, vu par axe).
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["large-title", "title-2", "headline", "body", "subhead", "footnote", "caption"] }],
    },
  },
});

/** Utilitaire de composition de classes (convention shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
