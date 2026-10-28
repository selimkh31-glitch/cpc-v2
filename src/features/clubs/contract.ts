import { z } from "zod";
import { PLATFORMS, POSITIONS } from "@/features/onboarding/referentials";

/**
 * Contrat du domaine Clubs (P2-B, sous-lot B0, docs/25 et docs/26).
 * Source de vérité côté application des commandes api.* à venir (B2) : entrées validées, sorties
 * attendues, codes d'erreur. Le SQL de B2 doit respecter exactement ces règles ; les vecteurs de
 * normalisation (tests/fixtures/normalize-search.json) seront rejoués en pgTAP.
 * Aucune donnée fictive : ce fichier ne contient que des règles.
 */

// ── Référentiels ──────────────────────────────────────────────────────────────────────────────
/** Niveau DÉCLARÉ par le club (docs/04 enum club_level), jamais présenté comme vérifié. */
export const CLUB_LEVELS = ["casual", "intermediate", "competitive", "elite"] as const;
export type ClubLevel = (typeof CLUB_LEVELS)[number];

/** Langues proposées (ISO 639-1). La base n'impose que le format `^[a-z]{2}$` (comme profiles.languages). */
export const CLUB_LANGUAGES = ["fr", "en", "es", "it", "de", "pt", "nl", "ar"] as const;
export type ClubLanguage = (typeof CLUB_LANGUAGES)[number];

export const CLUB_ROLES = ["owner", "manager", "member"] as const;
export type ClubRole = (typeof CLUB_ROLES)[number];
export const MEMBERSHIP_SLOTS = ["primary", "secondary"] as const;
export type MembershipSlot = (typeof MEMBERSHIP_SLOTS)[number];

export const CLUB_LIMITS = {
  nameMin: 3,
  nameMax: 32,
  slugMin: 3,
  descriptionMax: 500,
  languagesMax: 3,
  recruitingPositionsMax: POSITIONS.length,
  /** D-21 : deux affiliations actives au plus (PRIMARY + SECONDARY). */
  activeMembershipsMax: 2,
  /** D-21 : une création de club par fenêtre de 24 h et par joueur. */
  creationWindowHours: 24,
} as const;

// ── Normalisation (D-48) ─────────────────────────────────────────────────────────────────────
/**
 * Normalisation de recherche, miroir EXACT de `private.normalize_search(text)` (B2, IMMUTABLE,
 * sans extension) : minuscules → ligatures œ/æ → translate() des lettres accentuées → espaces
 * réduits. Toute modification doit être reportée dans la migration et dans les vecteurs de test.
 */
export const NORMALIZE_LIGATURES = [
  ["œ", "oe"],
  ["æ", "ae"],
  ["ß", "ss"],
] as const;
export const NORMALIZE_FROM = "àáâãäåāçćčèéêëēėęìíîïīñńòóôõöøōùúûüūýÿžźżšś";
export const NORMALIZE_TO = "aaaaaaaccceeeeeeeiiiiinnooooooouuuuuyyzzzss";

export function normalizeSearch(input: string): string {
  let s = input.toLowerCase();
  for (const [from, to] of NORMALIZE_LIGATURES) s = s.split(from).join(to);
  let out = "";
  for (const ch of s) {
    const i = NORMALIZE_FROM.indexOf(ch);
    out += i === -1 ? ch : NORMALIZE_TO[i];
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Slug unique du club (unicité du nom, D-21) : normalisation, puis tout ce qui n'est pas [a-z0-9] devient « - ». */
export function clubSlug(name: string): string {
  return normalizeSearch(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// ── Entrées des commandes ────────────────────────────────────────────────────────────────────
/** Nom : alphabet latin (accents compris), chiffres, espaces et « ' . _ & ! - ». */
const NAME_PATTERN = /^[\p{Script=Latin}0-9 '._&!-]+$/u;

export const clubNameSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(CLUB_LIMITS.nameMin)
      .max(CLUB_LIMITS.nameMax)
      .regex(NAME_PATTERN)
      .refine((v) => clubSlug(v).length >= CLUB_LIMITS.slugMin, { message: "slug" }),
  );

const descriptionSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().max(CLUB_LIMITS.descriptionMax))
  .transform((v) => (v === "" ? null : v));

const distinct = <T>(values: readonly T[]) => new Set(values).size === values.length;

const languagesSchema = z
  .array(z.enum(CLUB_LANGUAGES))
  .min(1)
  .max(CLUB_LIMITS.languagesMax)
  .refine(distinct, { message: "doublon" });

const recruitingPositionsSchema = z
  .array(z.enum(POSITIONS))
  .max(CLUB_LIMITS.recruitingPositionsMax)
  .refine(distinct, { message: "doublon" });

export const createClubInputSchema = z.object({
  requestId: z.uuid(),
  name: clubNameSchema,
  description: descriptionSchema,
  platform: z.enum(PLATFORMS),
  languages: languagesSchema,
  level: z.enum(CLUB_LEVELS),
  recruitingOpen: z.boolean(),
  recruitingPositions: recruitingPositionsSchema,
});
export type CreateClubInput = z.infer<typeof createClubInputSchema>;

/** Champs modifiables par OWNER / manager (CLB-06). Le nom n'est pas modifiable dans ce lot. */
export const updateClubInputSchema = z
  .object({
    requestId: z.uuid(),
    clubId: z.uuid(),
    /** Verrou optimiste : valeur `updated_at` lue avant édition ; différence → CONFLICT. */
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    description: descriptionSchema.optional(),
    languages: languagesSchema.optional(),
    level: z.enum(CLUB_LEVELS).optional(),
    recruitingOpen: z.boolean().optional(),
    recruitingPositions: recruitingPositionsSchema.optional(),
  })
  .refine(
    (v) => [v.description, v.languages, v.level, v.recruitingOpen, v.recruitingPositions].some((f) => f !== undefined),
    { message: "aucun champ" },
  );
export type UpdateClubInput = z.infer<typeof updateClubInputSchema>;

/** Arguments nommés des RPC (convention existante : préfixe p_, voir complete_onboarding). */
export function createClubRpcArgs(input: CreateClubInput) {
  return {
    p_request_id: input.requestId,
    p_name: input.name,
    p_description: input.description,
    p_platform: input.platform,
    p_languages: input.languages,
    p_level: input.level,
    p_recruiting_open: input.recruitingOpen,
    p_recruiting_positions: input.recruitingPositions,
  };
}

export function updateClubRpcArgs(input: UpdateClubInput) {
  return {
    p_request_id: input.requestId,
    p_club_id: input.clubId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_description: input.description,
    p_languages: input.languages,
    p_level: input.level,
    p_recruiting_open: input.recruitingOpen,
    p_recruiting_positions: input.recruitingPositions,
  };
}

// ── Sorties ──────────────────────────────────────────────────────────────────────────────────
const serverNow = z.iso.datetime({ offset: true });

/** `api.create_club` → `{ data, server_now }` (ADR-0004). Le rejeu du même request_id renvoie la même réponse. */
export const createClubResultSchema = z.object({
  data: z.object({ club_id: z.uuid(), slug: z.string().min(CLUB_LIMITS.slugMin), slot: z.enum(MEMBERSHIP_SLOTS) }),
  server_now: serverNow,
});

export const updateClubResultSchema = z.object({
  data: z.object({ club_id: z.uuid(), updated_at: serverNow }),
  server_now: serverNow,
});

/** Ligne renvoyée par `api.search_clubs` (lecture sous RLS). Aucun compteur d'activité ni de popularité. */
export const clubSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  platform: z.enum(PLATFORMS),
  languages: z.array(z.string().regex(/^[a-z]{2}$/)),
  level: z.enum(CLUB_LEVELS),
  recruiting_open: z.boolean(),
  recruiting_positions: z.array(z.enum(POSITIONS)),
  member_count: z.number().int().min(1),
  /** Relation du lecteur : membre actif ou non. « Candidature active » arrivera avec P2-D (D-46). */
  viewer_is_member: z.boolean(),
});
export type ClubSummary = z.infer<typeof clubSummarySchema>;

export const searchClubsResultSchema = z.object({
  data: z.object({ items: z.array(clubSummarySchema).max(20), next_cursor: z.string().nullable() }),
  server_now: serverNow,
});

// ── Codes d'erreur par commande (liste canonique docs/03 §4) ────────────────────────────────
export const CLUB_COMMAND_ERRORS = {
  create_club: ["UNAUTHENTICATED", "VALIDATION", "CONFLICT", "LIMIT_REACHED", "RATE_LIMITED"],
  update_club: ["UNAUTHENTICATED", "VALIDATION", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "RATE_LIMITED"],
  search_clubs: ["UNAUTHENTICATED", "VALIDATION"],
  block_user: ["UNAUTHENTICATED", "VALIDATION", "RATE_LIMITED"],
  unblock_user: ["UNAUTHENTICATED", "VALIDATION", "RATE_LIMITED"],
} as const;
export type ClubCommand = keyof typeof CLUB_COMMAND_ERRORS;
