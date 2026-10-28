import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P2-B · B1 : schémas exposés par PostgREST. `private`, `rls_policies` et `storage_policies` ne doivent
 * jamais être ajoutés à la liste (ils contiennent des fonctions SECURITY DEFINER internes).
 * Le staging suit la même liste (contrôlée dans la procédure d'application, docs/27 §4).
 */
const config = readFileSync(path.resolve(import.meta.dirname, "../../supabase/config.toml"), "utf8");
const apiSection = config.slice(config.indexOf("[api]"), config.indexOf("\n[", config.indexOf("[api]") + 1));
const schemas = JSON.parse(apiSection.match(/^schemas\s*=\s*(\[.*\])/m)?.[1] ?? "null") as string[] | null;

describe("supabase/config.toml — schémas exposés par l'API", () => {
  it("liste exacte : public, graphql_public, api", () => {
    expect(schemas).toEqual(["public", "graphql_public", "api"]);
  });
  it.each(["private", "rls_policies", "storage_policies", "auth", "storage"])("%s n'est pas exposé", (schema) => {
    expect(schemas).not.toContain(schema);
  });
});
