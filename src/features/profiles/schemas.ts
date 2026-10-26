import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(max))
    .transform((s) => (s === "" ? null : s));

/** Présentation (cahier UX §7 : panneau court, enregistrement indépendant). */
export const presentationSchema = z.object({ bio: optionalText(280) });

/** Identifiant EA déclaratif, jamais présenté comme vérifié (D-20, D-04). */
export const gamertagSchema = z.object({ eaGamertag: optionalText(32) });
