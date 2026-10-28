import { describe, expect, it } from "vitest";
import vectors from "../fixtures/normalize-search.json";
import {
  CLUB_COMMAND_ERRORS,
  NORMALIZE_FROM,
  NORMALIZE_TO,
  clubNameSchema,
  clubSlug,
  createClubInputSchema,
  createClubRpcArgs,
  normalizeSearch,
  updateClubInputSchema,
} from "@/features/clubs/contract";
import { RPC_ERROR_CODES } from "@/lib/errors/rpc";

const REQ = "6f9619ff-8b86-4011-b42d-00cf4fc964ff";
const CLUB = "1b4e28ba-2fa1-41d2-883f-0016d3cca427";
const base = {
  requestId: REQ,
  name: "FC Bayonne",
  description: "",
  platform: "ps5",
  languages: ["fr"],
  level: "competitive",
  recruitingOpen: true,
  recruitingPositions: ["CB", "ST"],
};

describe("normalisation D-48 (miroir de private.normalize_search)", () => {
  it("table translate() cohérente : même longueur, aucun doublon source", () => {
    expect([...NORMALIZE_FROM].length).toBe([...NORMALIZE_TO].length);
    expect(new Set(NORMALIZE_FROM).size).toBe([...NORMALIZE_FROM].length);
  });
  it.each(vectors.vectors)("%s → « %s » / slug %s", (input, normalized, slug) => {
    expect(normalizeSearch(input)).toBe(normalized);
    expect(clubSlug(input)).toBe(slug);
  });
  it("insensible à la casse et aux accents : deux saisies équivalentes donnent le même slug (unicité du nom)", () => {
    expect(clubSlug("Étoile Rouge")).toBe(clubSlug("etoile   ROUGE"));
  });
});

describe("nom de club", () => {
  it.each(["FC Bayonne", "L'Équipe & Co!", "Pro_Clubs.FR", "ABC"])("accepte « %s »", (name) => {
    expect(clubNameSchema.safeParse(name).success).toBe(true);
  });
  it("réduit les espaces", () => {
    expect(clubNameSchema.parse("  Les   Canaris ")).toBe("Les Canaris");
  });
  it.each([
    ["trop court", "AB"],
    ["trop long", "A".repeat(33)],
    ["caractères hors alphabet latin", "Клуб Москва"],
    ["emoji", "FC 🔥 Fire"],
    ["balise", "<script>"],
    ["slug trop court", "!! ''"],
  ])("refuse : %s", (_label, name) => {
    expect(clubNameSchema.safeParse(name).success).toBe(false);
  });
});

describe("create_club : entrées", () => {
  it("accepte une création valide et vide la description vide", () => {
    const parsed = createClubInputSchema.parse(base);
    expect(parsed.description).toBeNull();
    expect(createClubRpcArgs(parsed)).toEqual({
      p_request_id: REQ,
      p_name: "FC Bayonne",
      p_description: null,
      p_platform: "ps5",
      p_languages: ["fr"],
      p_level: "competitive",
      p_recruiting_open: true,
      p_recruiting_positions: ["CB", "ST"],
    });
  });
  it.each([
    ["request_id absent (idempotence obligatoire)", { requestId: undefined }],
    ["request_id non UUID", { requestId: "abc" }],
    ["plateforme inconnue", { platform: "switch" }],
    ["aucune langue", { languages: [] }],
    ["plus de 3 langues", { languages: ["fr", "en", "es", "it"] }],
    ["langue en double", { languages: ["fr", "fr"] }],
    ["langue hors référentiel", { languages: ["xx"] }],
    ["niveau inconnu", { level: "pro" }],
    ["poste inconnu", { recruitingPositions: ["XX"] }],
    ["poste en double", { recruitingPositions: ["ST", "ST"] }],
    ["description > 500", { description: "a".repeat(501) }],
    ["champ supplémentaire de rôle ignoré mais rôle jamais transmis", { role: "owner" }],
  ])("%s", (label, patch) => {
    const result = createClubInputSchema.safeParse({ ...base, ...patch });
    if (label.startsWith("champ supplémentaire")) {
      // Le rôle n'est jamais un paramètre : le serveur fixe OWNER (D-21). Zod retire la clé.
      expect(result.success).toBe(true);
      expect(createClubRpcArgs(result.data!)).not.toHaveProperty("p_role");
    } else {
      expect(result.success).toBe(false);
    }
  });
});

describe("update_club : entrées", () => {
  const ok = { requestId: REQ, clubId: CLUB, expectedUpdatedAt: "2026-10-28T19:43:00+01:00", recruitingOpen: false };
  it("accepte une modification avec verrou optimiste", () => {
    expect(updateClubInputSchema.safeParse(ok).success).toBe(true);
  });
  it("refuse sans verrou optimiste", () => {
    expect(updateClubInputSchema.safeParse({ ...ok, expectedUpdatedAt: undefined }).success).toBe(false);
  });
  it("refuse une modification vide", () => {
    expect(updateClubInputSchema.safeParse({ requestId: REQ, clubId: CLUB, expectedUpdatedAt: ok.expectedUpdatedAt }).success).toBe(false);
  });
  it("le nom n'est pas modifiable dans ce lot", () => {
    const parsed = updateClubInputSchema.parse({ ...ok, name: "Autre" });
    expect(parsed).not.toHaveProperty("name");
  });
});

describe("codes d'erreur", () => {
  it("chaque commande n'utilise que des codes canoniques connus de l'application", () => {
    for (const codes of Object.values(CLUB_COMMAND_ERRORS)) {
      for (const code of codes) expect(RPC_ERROR_CODES).toContain(code);
    }
  });
});
