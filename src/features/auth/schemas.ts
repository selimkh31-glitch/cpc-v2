import { z } from "zod";

export const emailSchema = z.email().max(254);
// Aligné sur supabase/config.toml : ≥ 10 caractères, lettres et chiffres.
export const passwordSchema = z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/[0-9]/);

export const credentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  next: z.string().optional(),
});
