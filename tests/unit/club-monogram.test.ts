import { describe, expect, it } from "vitest";
import { getClubInitials } from "@/components/ui/club-monogram";

describe("Monogrammes de club (D-43 : aucun blason inventé)", () => {
  it("utilise les initiales des deux premiers mots", () => {
    expect(getClubInitials("Étoile de Bayonne")).toBe("ÉD");
    expect(getClubInitials("Club Pro")).toBe("CP");
  });
  it("gère un nom d'un seul mot et les espaces", () => {
    expect(getClubInitials(" Racing ")).toBe("RA");
    expect(getClubInitials(" ")).toBe("FC");
  });
});
