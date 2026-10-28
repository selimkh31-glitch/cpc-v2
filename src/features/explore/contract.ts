import { z } from "zod";
import { PLATFORMS, POSITIONS, type Platform, type Position } from "@/features/onboarding/referentials";
import { CLUB_LANGUAGES, CLUB_LEVELS, CLUB_LIMITS, normalizeSearch, type ClubLanguage, type ClubLevel } from "@/features/clubs/contract";

/**
 * Contrat d'Explorer (P2-B, sous-lot B0, docs/25 §6 et docs/26) : intentions, filtres d'URL,
 * curseur et arguments de `api.search_clubs`. Règles pures, testées en Vitest.
 *
 * Principes :
 *  - l'URL porte tout l'état (EXP-01, S-4.4) ; une valeur inconnue est ignorée, jamais transmise ;
 *  - les valeurs par défaut ne sont pas écrites dans l'URL (URL canonique, retour arrière stable) ;
 *  - aucune intention sans donnée réelle : « players » n'existe pas dans ce lot (D-11, Radar).
 */

// ── Intentions ───────────────────────────────────────────────────────────────────────────────
/** Segments visibles dans ce lot (D-47 : Jouer visible avec un état vide véridique). Joueurs absent. */
export const EXPLORE_INTENTS = ["play", "clubs"] as const;
export type ExploreIntent = (typeof EXPLORE_INTENTS)[number];
export const DEFAULT_EXPLORE_INTENT: ExploreIntent = "clubs";

export function isExploreIntent(value: unknown): value is ExploreIntent {
  return typeof value === "string" && (EXPLORE_INTENTS as readonly string[]).includes(value);
}

// ── Filtres Clubs ────────────────────────────────────────────────────────────────────────────
export const SEARCH_PAGE_SIZE = 20;
export const SEARCH_QUERY_MIN = 2;
export const SEARCH_QUERY_MAX = CLUB_LIMITS.nameMax;

/** Valeurs par défaut issues du joueur connecté (sa plateforme ; Recrute activé, docs/25 §6). */
export type ClubFilterDefaults = { platform: Platform };

export type ClubFilters = {
  /** Texte saisi (affichage) ; la recherche utilise sa forme normalisée. */
  q: string | null;
  /** Plateforme, ou null = toutes (choix explicite « all » dans l'URL). */
  platform: Platform | null;
  recruitingOnly: boolean;
  position: Position | null;
  languages: ClubLanguage[];
  level: ClubLevel | null;
  cursor: string | null;
};

type ParamsLike = { get(name: string): string | null; getAll(name: string): string[] };

const one = <T extends string>(values: readonly T[], raw: string | null): T | null =>
  raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : null;

/** Lit les filtres depuis l'URL : chaque valeur inconnue est ignorée ; les défauts s'appliquent si absents. */
export function parseClubFilters(params: ParamsLike, defaults: ClubFilterDefaults): ClubFilters {
  const rawQ = (params.get("q") ?? "").replace(/\s+/g, " ").trim();
  const q = rawQ.length >= SEARCH_QUERY_MIN ? rawQ.slice(0, SEARCH_QUERY_MAX) : null;

  const rawPlatform = params.get("platform");
  const platform = rawPlatform === "all" ? null : (one(PLATFORMS, rawPlatform) ?? defaults.platform);

  const recruitingOnly = params.get("recruiting") !== "all";
  const position = one(POSITIONS, params.get("position"));
  const languages = [...new Set(params.getAll("lang"))]
    .filter((l): l is ClubLanguage => (CLUB_LANGUAGES as readonly string[]).includes(l))
    .slice(0, CLUB_LIMITS.languagesMax);
  const level = one(CLUB_LEVELS, params.get("level"));
  const cursorRaw = params.get("cursor");
  const cursor = cursorRaw && decodeCursor(cursorRaw) ? cursorRaw : null;

  return { q, platform, recruitingOnly, position, languages, level, cursor };
}

/** Écrit l'URL canonique : seules les valeurs différentes des défauts apparaissent, dans un ordre fixe. */
export function serializeClubFilters(filters: ClubFilters, defaults: ClubFilterDefaults, options: { includeCursor?: boolean } = {}): URLSearchParams {
  const out = new URLSearchParams();
  if (filters.q) out.set("q", filters.q);
  if (filters.platform === null) out.set("platform", "all");
  else if (filters.platform !== defaults.platform) out.set("platform", filters.platform);
  if (!filters.recruitingOnly) out.set("recruiting", "all");
  if (filters.position) out.set("position", filters.position);
  for (const l of [...filters.languages].sort()) out.append("lang", l);
  if (filters.level) out.set("level", filters.level);
  if (options.includeCursor && filters.cursor) out.set("cursor", filters.cursor);
  return out;
}

/** Nombre de filtres actifs hors défauts (badge « Filtres (n) »). La recherche texte n'est pas comptée. */
export function activeFilterCount(filters: ClubFilters, defaults: ClubFilterDefaults): number {
  return (
    (filters.platform !== defaults.platform ? 1 : 0) +
    (filters.recruitingOnly ? 0 : 1) +
    (filters.position ? 1 : 0) +
    filters.languages.length +
    (filters.level ? 1 : 0)
  );
}

// ── Curseur (pagination stable, tri total : recruiting_open desc, search_name asc, id asc) ──
/** r = groupe « recrute » de la dernière ligne, n = search_name, i = id. */
const cursorSchema = z.object({ r: z.boolean(), n: z.string().max(64), i: z.uuid() }).strict();
export type ClubCursor = z.infer<typeof cursorSchema>;

// base64url universel (serveur et navigateur), sans Buffer.
function toBase64Url(text: string): string {
  let bin = "";
  for (const byte of new TextEncoder().encode(text)) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(raw: string): string {
  const bin = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeCursor(cursor: ClubCursor): string {
  return toBase64Url(JSON.stringify(cursor));
}

export function decodeCursor(raw: string): ClubCursor | null {
  if (raw.length > 200 || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  try {
    const parsed = cursorSchema.safeParse(JSON.parse(fromBase64Url(raw)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// ── Arguments de api.search_clubs ────────────────────────────────────────────────────────────
/** Arguments nommés de `api.search_clubs` (B3). Le texte est normalisé côté client ET re-normalisé côté SQL. */
export function searchClubsRpcArgs(filters: ClubFilters) {
  const cursor = filters.cursor ? decodeCursor(filters.cursor) : null;
  return {
    p_q: filters.q ? normalizeSearch(filters.q) : null,
    p_platform: filters.platform,
    p_recruiting_only: filters.recruitingOnly,
    p_position: filters.position,
    p_languages: filters.languages.length ? filters.languages : null,
    p_level: filters.level,
    p_cursor_recruiting: cursor?.r ?? null,
    p_cursor_name: cursor?.n ?? null,
    p_cursor_id: cursor?.i ?? null,
    p_limit: SEARCH_PAGE_SIZE,
  };
}
