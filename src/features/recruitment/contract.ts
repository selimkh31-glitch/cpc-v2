import { z } from "zod";
import { RPC_ERROR_CODES } from "@/lib/errors/rpc";

/**
 * CPC V2 · P2-D0 — Candidatures club.
 * Contrat seulement : aucune RPC ni CTA affiché tant que P2-D1 (SQL + RLS) n'est pas validé.
 * D-22 (durée de validité) et D-13 (remplacement du SECONDARY) restent à confirmer.
 */
export const APPLICATION_STATUSES = [
  "pending",
  "awaiting_player_confirmation",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
] as const;

export const APPLICATION_DECISIONS = ["accept", "reject"] as const;
export const APPLICATION_ACTIVE_STATUSES = ["pending", "awaiting_player_confirmation"] as const;
export const APPLICATION_MESSAGE_MAX = 500;

/** Durées serveur validées D-22 le 06/11/2026 ; jamais fournies dans les entrées RPC. */
export const RECRUITMENT_EXPIRY = {
  applicationDays: 14,
  invitationDays: 7,
  ownershipTransferHours: 72,
} as const;

const uuid = z.uuid();
const serverNow = z.iso.datetime({ offset: true });

/** Les contrôles d'affiliation, recrutement, blocage, sanctions et rôles sont côté SQL. */
export const applyToClubSchema = z.strictObject({
  requestId: uuid,
  clubId: uuid,
  message: z.string().trim().max(APPLICATION_MESSAGE_MAX).transform((v) => v || null),
});
export type ApplyToClubInput = z.infer<typeof applyToClubSchema>;

export const withdrawApplicationSchema = z.strictObject({
  requestId: uuid,
  applicationId: uuid,
});
export type WithdrawApplicationInput = z.infer<typeof withdrawApplicationSchema>;

export const decideApplicationSchema = z.strictObject({
  requestId: uuid,
  applicationId: uuid,
  decision: z.enum(APPLICATION_DECISIONS),
});
export type DecideApplicationInput = z.infer<typeof decideApplicationSchema>;

/**
 * L'acceptation avec deux affiliations ne retire JAMAIS un club automatiquement.
 * Un second consentement explicite sélectionne un SECONDARY existant, sous garde SQL.
 */
export const confirmMembershipReplacementSchema = z.strictObject({
  requestId: uuid,
  applicationId: uuid,
  replaceMembershipId: uuid,
  acknowledgeManagerRoleLoss: z.boolean(),
});
export type ConfirmMembershipReplacementInput = z.infer<typeof confirmMembershipReplacementSchema>;

export function applyToClubArgs(input: ApplyToClubInput) {
  return {
    p_request_id: input.requestId,
    p_club_id: input.clubId,
    p_message: input.message,
  };
}
export function withdrawApplicationArgs(input: WithdrawApplicationInput) {
  return {
    p_request_id: input.requestId,
    p_application_id: input.applicationId,
  };
}
export function decideApplicationArgs(input: DecideApplicationInput) {
  return {
    p_request_id: input.requestId,
    p_application_id: input.applicationId,
    p_decision: input.decision,
  };
}
export function confirmMembershipReplacementArgs(input: ConfirmMembershipReplacementInput) {
  return {
    p_request_id: input.requestId,
    p_application_id: input.applicationId,
    p_replace_membership_id: input.replaceMembershipId,
    p_acknowledge_manager_role_loss: input.acknowledgeManagerRoleLoss,
  };
}

/** DTO minimal : aucune donnée sensible ou identifiant de session n'est renvoyé. */
export const applicationSummarySchema = z.strictObject({
  id: uuid,
  club_id: uuid,
  profile_id: uuid,
  status: z.enum(APPLICATION_STATUSES),
  message: z.string().nullable(),
  created_at: serverNow,
  expires_at: serverNow,
});
export type ApplicationSummary = z.infer<typeof applicationSummarySchema>;

export const applicationCommandResultSchema = z.object({
  data: z.object({
    application_id: uuid,
    status: z.enum(APPLICATION_STATUSES),
    club_id: uuid,
    membership_id: uuid.optional().nullable(),
  }),
  server_now: serverNow,
});

/**
 * Contrat d'erreur : uniquement les codes existants dans la liste canonique.
 * Pour masquer un blocage entre joueurs, ne pas distinguer 'bloqué' d'inaccessible côté UI.
 */
export const APPLICATION_COMMAND_ERRORS = {
  apply_to_club: ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "CONFLICT", "LIMIT_REACHED", "RATE_LIMITED"],
  withdraw_application: ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "ALREADY_HANDLED"],
  decide_application: ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "ALREADY_HANDLED", "EXPIRED", "CONFLICT"],
  confirm_membership_replacement: ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "VALIDATION", "ALREADY_HANDLED", "EXPIRED", "CONFLICT", "CONSENT_REQUIRED", "OWNER_MUST_TRANSFER"],
} as const satisfies Record<string, readonly (typeof RPC_ERROR_CODES)[number][]>;
