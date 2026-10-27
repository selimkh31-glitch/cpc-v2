/** Référentiels validés : D-15 (plateformes) et D-14 (15 postes, 4 groupes). Libellés dans messages/fr.json. */
export const PLATFORMS = ["ps5", "xbox_series", "pc"] as const;
export const POSITIONS = ["GK", "RB", "LB", "CB", "RWB", "LWB", "CDM", "CM", "CAM", "RM", "LM", "RW", "LW", "CF", "ST"] as const;
export type Platform = (typeof PLATFORMS)[number];
export type Position = (typeof POSITIONS)[number];
export const MAX_SECONDARY_POSITIONS = 3;
/** D-12 : seuil TEMPORAIRE, à valider juridiquement avant ouverture publique. */
export const AGE_MIN = 18;
/** D-14 : regroupement des postes par ligne (miroir de `public.position_group_of`). */
export const POSITION_GROUPS = [
  { key: "GK", positions: ["GK"] },
  { key: "DEF", positions: ["RB", "LB", "CB", "RWB", "LWB"] },
  { key: "MID", positions: ["CDM", "CM", "CAM", "RM", "LM"] },
  { key: "ATT", positions: ["RW", "LW", "CF", "ST"] },
] as const satisfies readonly { key: string; positions: readonly Position[] }[];
