import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPLORE_INTENT,
  EXPLORE_INTENTS,
  SEARCH_PAGE_SIZE,
  activeFilterCount,
  decodeCursor,
  encodeCursor,
  isExploreIntent,
  parseClubFilters,
  searchClubsRpcArgs,
  serializeClubFilters,
} from "@/features/explore/contract";

const defaults = { platform: "ps5" } as const;
const parse = (qs: string) => parseClubFilters(new URLSearchParams(qs), defaults);
const CURSOR = encodeCursor({ r: true, n: "fc bayonne", i: "1b4e28ba-2fa1-41d2-883f-0016d3cca427" });

describe("intentions", () => {
  it("Jouer et Clubs seulement ; Joueurs absent tant que Radar et D-11 n'existent pas", () => {
    expect(EXPLORE_INTENTS).toEqual(["play", "clubs"]);
    expect(isExploreIntent("players")).toBe(false);
    expect(DEFAULT_EXPLORE_INTENT).toBe("clubs");
  });
});

describe("lecture des filtres d'URL", () => {
  it("défauts : plateforme du joueur, Recrute activé, rien d'autre", () => {
    expect(parse("")).toEqual({ q: null, platform: "ps5", recruitingOnly: true, position: null, languages: [], level: null, cursor: null });
  });
  it("choix explicites", () => {
    expect(parse("q=%C3%89toile&platform=all&recruiting=all&position=ST&lang=fr&lang=en&level=elite")).toMatchObject({
      q: "Étoile",
      platform: null,
      recruitingOnly: false,
      position: "ST",
      languages: ["fr", "en"],
      level: "elite",
    });
  });
  it.each([
    ["plateforme inconnue → défaut", "platform=switch", { platform: "ps5" }],
    ["poste inconnu ignoré", "position=XX", { position: null }],
    ["niveau inconnu ignoré", "level=pro", { level: null }],
    ["langues inconnues et doublons ignorés, 3 maximum", "lang=fr&lang=xx&lang=fr&lang=en&lang=es&lang=it", { languages: ["fr", "en", "es"] }],
    ["recherche d'un caractère ignorée", "q=a", { q: null }],
    ["recherche tronquée à 32", `q=${"a".repeat(50)}`, { q: "a".repeat(32) }],
    ["curseur falsifié ignoré", "cursor=%27%3B%20drop", { cursor: null }],
    ["curseur valide conservé", `cursor=${CURSOR}`, { cursor: CURSOR }],
  ])("%s", (_label, qs, expected) => {
    expect(parse(qs)).toMatchObject(expected);
  });
});

describe("URL canonique", () => {
  it("les défauts n'apparaissent pas ; ordre et langues stables", () => {
    const f = parse("lang=en&lang=fr&position=CB&platform=ps5");
    expect(serializeClubFilters(f, defaults).toString()).toBe("position=CB&lang=en&lang=fr");
  });
  it("aller-retour : lire(écrire(f)) = f", () => {
    const f = parse("q=FC&platform=all&recruiting=all&position=GK&lang=fr&level=casual");
    expect(parse(serializeClubFilters(f, defaults).toString())).toEqual(f);
  });
  it("le curseur n'est écrit que sur demande (un changement de filtre repart de la première page)", () => {
    const f = parse(`cursor=${CURSOR}`);
    expect(serializeClubFilters(f, defaults).has("cursor")).toBe(false);
    expect(serializeClubFilters(f, defaults, { includeCursor: true }).get("cursor")).toBe(CURSOR);
  });
  it("compte les filtres actifs hors défauts", () => {
    expect(activeFilterCount(parse(""), defaults)).toBe(0);
    expect(activeFilterCount(parse("platform=all&recruiting=all&lang=fr&lang=en"), defaults)).toBe(4);
  });
});

describe("curseur", () => {
  it("encode / décode", () => {
    expect(decodeCursor(CURSOR)).toEqual({ r: true, n: "fc bayonne", i: "1b4e28ba-2fa1-41d2-883f-0016d3cca427" });
  });
  it.each(["", "!!!", "e30", encodeCursor({ r: true, n: "x", i: "pas-un-uuid" } as never), encodeCursor({ n: "x", i: "1b4e28ba-2fa1-41d2-883f-0016d3cca427" } as never), "A".repeat(201)])("rejette %s", (raw) => {
    expect(decodeCursor(raw)).toBeNull();
  });
});

describe("arguments de api.search_clubs", () => {
  it("texte normalisé, filtres mappés, page de 20", () => {
    expect(searchClubsRpcArgs(parse(`q=%C3%89TOILE%20Rouge&lang=fr&cursor=${CURSOR}`))).toEqual({
      p_q: "etoile rouge",
      p_platform: "ps5",
      p_recruiting_only: true,
      p_position: null,
      p_languages: ["fr"],
      p_level: null,
      p_cursor_recruiting: true,
      p_cursor_name: "fc bayonne",
      p_cursor_id: "1b4e28ba-2fa1-41d2-883f-0016d3cca427",
      p_limit: SEARCH_PAGE_SIZE,
    });
  });
  it("sans filtre facultatif : null (jamais de chaîne vide transmise)", () => {
    const args = searchClubsRpcArgs(parse("platform=all"));
    expect(args.p_q).toBeNull();
    expect(args.p_platform).toBeNull();
    expect(args.p_languages).toBeNull();
  });
});
