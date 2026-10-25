import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/redirect";

describe("safeNextPath (anti open redirect)", () => {
  it.each([
    ["/spike/session", "/spike/session"],
    ["/clubs/abc?tab=roster", "/clubs/abc?tab=roster"],
    ["/profile#invitations", "/profile#invitations"],
  ])("accepte le chemin interne %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "evil.example",
    "/path\u0000",
    "",
    "x".repeat(600),
  ])("rejette %j", (input) => {
    expect(safeNextPath(input)).toBe("/home");
  });

  it("rejette les valeurs non textuelles", () => {
    expect(safeNextPath(undefined)).toBe("/home");
    expect(safeNextPath(["/a"])).toBe("/home");
  });
});
