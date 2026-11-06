import { describe, expect, it } from "vitest";
import { clubInitials } from "@/components/ui/club-monogram";

describe("ClubMonogram — initiales temporaires D-43", () => {
  it("utilise les initiales du premier et dernier mots", () => {
    expect(clubInitials("FC Bayonne")).toBe("FB");
    expect(clubInitials("Club des Lions")).toBe("CL");
  });
  it("gère un mot, un nom vide et les accents", () => {
    expect(clubInitials("Étoile")).toBe("ÉT");
    expect(clubInitials("   ")).toBe("?");
    expect(clubInitials("  A   B  ")).toBe("AB");
  });
});
