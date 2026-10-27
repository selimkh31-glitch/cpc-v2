import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isUiGalleryEnabled } from "@/lib/dev/gallery";

/** P2-A (docs/23 §2.1, §7) : contrastes WCAG 2.1 des tokens, revérifiés à chaque modification. */
const css = readFileSync(path.resolve(import.meta.dirname, "../../src/app/globals.css"), "utf8");

function block(source: string, start: string): Record<string, string> {
  const from = source.indexOf(start);
  if (from < 0) throw new Error(`bloc introuvable : ${start}`);
  const open = source.indexOf("{", source.indexOf(":root", from));
  const body = source.slice(open + 1, source.indexOf("}", open));
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1] ?? "", (m[2] ?? "").toLowerCase()]));
}

const dark = block(css, ":root {");
const light = { ...dark, ...block(css, "@media (prefers-color-scheme: light)") };

function channel(hex: string, i: number) {
  const c = parseInt(hex.slice(i, i + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}
function luminance(hex: string) {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}
function contrast(a: string, b: string) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function tok(theme: Record<string, string>, name: string): string {
  const value = theme[name];
  if (!value) throw new Error(`token manquant : --${name}`);
  return value;
}

// Texte informatif : 4,5:1 minimum ; éléments graphiques (pastille LIVE) : 3:1 minimum.
const textPairs: [string, string][] = [
  ["text", "bg"], ["text", "surface-1"], ["text", "surface-2"],
  ["text-2", "bg"], ["text-2", "surface-1"], ["text-2", "surface-2"],
  ["text-3", "bg"], ["text-3", "surface-1"],
  ["accent", "bg"], ["accent", "surface-1"], ["on-accent", "accent"],
  ["live-text", "bg"], ["live-text", "surface-1"],
  ["danger", "surface-1"], ["danger", "surface-2"],
];

describe.each([["sombre", dark], ["clair", light]] as const)("tokens %s", (_name, theme) => {
  it.each(textPairs)("%s sur %s ≥ 4,5:1", (fg, bg) => {
    expect(contrast(tok(theme, fg), tok(theme, bg))).toBeGreaterThanOrEqual(4.5);
  });
  it("pastille LIVE ≥ 3:1 sur le fond", () => {
    expect(contrast(tok(theme, "live"), tok(theme, "bg"))).toBeGreaterThanOrEqual(3);
    expect(contrast(tok(theme, "live"), tok(theme, "surface-1"))).toBeGreaterThanOrEqual(3);
  });
});

describe("galerie UI", () => {
  it("fermée par défaut, ouverte seulement avec ENABLE_UI_GALLERY=1 hors Vercel", () => {
    expect(isUiGalleryEnabled({})).toBe(false);
    expect(isUiGalleryEnabled({ ENABLE_UI_GALLERY: "1" })).toBe(true);
    expect(isUiGalleryEnabled({ ENABLE_UI_GALLERY: "1", VERCEL: "1" })).toBe(false);
    expect(isUiGalleryEnabled({ ENABLE_UI_GALLERY: "true" })).toBe(false);
  });
});

describe("cn (tailwind-merge)", () => {
  it("conserve la couleur de texte à côté d'une taille du design system", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("text-on-accent", "text-headline")).toBe("text-on-accent text-headline");
    expect(cn("text-ink", "text-body", "text-danger")).toBe("text-body text-danger");
  });
});
