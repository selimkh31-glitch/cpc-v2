import { z } from "zod";
import { MAX_SECONDARY_POSITIONS, PLATFORMS, POSITIONS } from "./referentials";

export const onboardingSchema = z
  .object({
    requestId: z.uuid(),
    handle: z.string().trim().toLowerCase().regex(/^[a-z0-9_.-]{3,20}$/),
    platform: z.enum(PLATFORMS),
    mainPosition: z.enum(POSITIONS),
    secondaryPositions: z.array(z.enum(POSITIONS)).max(MAX_SECONDARY_POSITIONS),
    ageConfirmed: z.literal(true),
  })
  .refine((v) => !v.secondaryPositions.includes(v.mainPosition), { path: ["secondaryPositions"] })
  .refine((v) => new Set(v.secondaryPositions).size === v.secondaryPositions.length, { path: ["secondaryPositions"] });

export function parseOnboardingForm(formData: FormData) {
  return onboardingSchema.safeParse({
    requestId: formData.get("requestId"),
    handle: formData.get("handle"),
    platform: formData.get("platform"),
    mainPosition: formData.get("mainPosition"),
    secondaryPositions: formData.getAll("secondaryPositions"),
    ageConfirmed: formData.get("ageConfirmed") === "on",
  });
}
