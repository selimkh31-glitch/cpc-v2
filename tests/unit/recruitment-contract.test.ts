import { describe, expect, it } from "vitest";
import {
  APPLICATION_ACTIVE_STATUSES,
  APPLICATION_COMMAND_ERRORS,
  APPLICATION_MESSAGE_MAX,
  APPLICATION_STATUSES,
  applyToClubArgs,
  applyToClubSchema,
  applicationCommandResultSchema,
  confirmMembershipReplacementArgs,
  confirmMembershipReplacementSchema,
  decideApplicationArgs,
  decideApplicationSchema,
  withdrawApplicationArgs,
  withdrawApplicationSchema,
} from "@/features/recruitment/contract";
import { RPC_ERROR_CODES } from "@/lib/errors/rpc";

const requestId = "6f9619ff-8b86-4011-b42d-00cf4fc964ff";
const clubId = "1b4e28ba-2fa1-41d2-883f-0016d3cca427";
const applicationId = "8d985e41-677e-4211-ad2c-1a99194439d1";
const membershipId = "035d8f27-3259-4562-a5e5-52602ae1dad7";

describe("P2-D0 — contrat de candidature", () => {
  it("préserve exactement les états définis dans docs/04", () => {
    expect(APPLICATION_STATUSES).toEqual(["pending","awaiting_player_confirmation","accepted","rejected","withdrawn","expired"]);
    expect(APPLICATION_ACTIVE_STATUSES).toEqual(["pending","awaiting_player_confirmation"]);
  });
  it("n'autorise pas le client à fournir status, club role, profile ou slot", () => {
    const forged = applyToClubSchema.safeParse({
      requestId, clubId, message: "Salut", status: "accepted", role: "owner", profileId: requestId,
    });
    expect(forged.success).toBe(false);
  });
  it("normalise un message facultatif vide en NULL et ne dépasse pas 500 caractères", () => {
    expect(applyToClubArgs(applyToClubSchema.parse({ requestId, clubId, message: "   " })))
      .toEqual({ p_request_id: requestId, p_club_id: clubId, p_message: null });
    expect(applyToClubSchema.parse({ requestId, clubId, message: "  Salut !  " }).message).toBe("Salut !");
    expect(applyToClubSchema.safeParse({ requestId, clubId, message: "x".repeat(APPLICATION_MESSAGE_MAX + 1) }).success)
      .toBe(false);
  });
  it("refuse les identifiants invalides et le requestId manquant", () => {
    expect(applyToClubSchema.safeParse({ requestId: undefined, clubId, message: "test" }).success).toBe(false);
    expect(applyToClubSchema.safeParse({ requestId, clubId: "abc", message: "test" }).success).toBe(false);
  });
  it("retirer une candidature cible uniquement sa candidature, pas le club", () => {
    expect(withdrawApplicationArgs(withdrawApplicationSchema.parse({ requestId, applicationId }))).toEqual({
      p_request_id: requestId, p_application_id: applicationId,
    });
  });
  it("un responsable peut décider accept ou reject, sans statut forgé", () => {
    expect(decideApplicationArgs(decideApplicationSchema.parse({ requestId, applicationId, decision: "accept" })))
      .toEqual({ p_request_id: requestId, p_application_id: applicationId, p_decision: "accept" });
    expect(decideApplicationSchema.safeParse({ requestId, applicationId, decision: "approve" }).success).toBe(false);
    expect(decideApplicationSchema.safeParse({ requestId, applicationId, decision: "reject", role: "owner" }).success)
      .toBe(false);
  });
  it("le remplacement d'un SECONDARY exige un consentement sur une adhésion précise", () => {
    expect(confirmMembershipReplacementSchema.safeParse({ requestId, applicationId }).success).toBe(false);
    const input = confirmMembershipReplacementSchema.parse({ requestId, applicationId, replaceMembershipId: membershipId });
    expect(confirmMembershipReplacementArgs(input)).toEqual({
      p_request_id: requestId, p_application_id: applicationId, p_replace_membership_id: membershipId,
    });
  });
  it("sortie serveur versionnée et horodatée, idempotente pour la même requête", () => {
    const payload = {
      data: { application_id: applicationId, club_id: clubId, status: "pending" },
      server_now: "2026-11-06T14:42:00+01:00",
    };
    expect(applicationCommandResultSchema.safeParse(payload).success).toBe(true);
    expect(applicationCommandResultSchema.safeParse({ ...payload, data: { ...payload.data, status: "forged" } }).success)
      .toBe(false);
  });
  it("aucun code d'erreur nouveau ou non reconnu", () => {
    for (const code of Object.values(APPLICATION_COMMAND_ERRORS).flat()) {
      expect(RPC_ERROR_CODES).toContain(code);
    }
  });
});
