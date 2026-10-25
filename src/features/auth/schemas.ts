import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email().max(254),
  // Aligné sur supabase/config.toml : ≥ 10 caractères, lettres et chiffres.
  password: z.string().min(10).max(128),
  next: z.string().optional(),
});
