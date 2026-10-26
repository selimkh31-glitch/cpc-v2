import { describe, expect, it } from "vitest";
import { isTabActive } from "@/lib/navigation";

describe("isTabActive", () => {
  it.each([
    ["/home", "/home", true],
    ["/profile/invitations", "/profile", true],
    ["/explore/play", "/explore", true],
    ["/profiles", "/profile", false],
    ["/homepage", "/home", false],
    ["/", "/home", false],
  ])("%s pour l'onglet %s → %s", (pathname, href, expected) => {
    expect(isTabActive(pathname, href)).toBe(expected);
  });
});
