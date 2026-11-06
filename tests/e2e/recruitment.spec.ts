import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createOnboardedUser, login, SUPABASE_URL, userAccessToken } from "./helpers/supabase";

/** P2-D3 : vrai flux de recrutement, UNIQUEMENT sur Supabase local (helper à garde dure). */
test.describe("P2-D3 — candidature et décision du manager", () => {
  test("candidat envoie une demande, manager l'accepte, effectif réellement mis à jour", async ({ browser }) => {
    const owner = await createOnboardedUser();
    const candidate = await createOnboardedUser();
    const token = await userAccessToken(owner.email);
    const headers = {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
      "Content-Profile": "api",
      "Accept-Profile": "api",
    };
    const creation = await fetch(SUPABASE_URL() + "/rest/v1/rpc/create_club", {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_request_id: randomUUID(),
        p_name: "Recruit QA " + Date.now().toString(36),
        p_description: "Équipe locale QA",
        p_platform: "pc",
        p_languages: ["fr"],
        p_level: "competitive",
        p_recruiting_open: true,
        p_recruiting_positions: ["ST"],
      }),
    });
    const payload = await creation.text();
    expect(creation.ok, "create_club locale : " + creation.status + " " + payload).toBeTruthy();
    const id = (JSON.parse(payload) as { data: { club_id: string } }).data.club_id;
    const clubPath = "/clubs/" + id;
    const ownerContext = await browser.newContext();
    const applicantContext = await browser.newContext();
    try {
      const player = await applicantContext.newPage();
      await login(player, candidate.email);
      await player.goto(clubPath);
      await expect(player.getByRole("heading", { name: "Rejoindre ce club" })).toBeVisible();
      await player.getByLabel("Message (facultatif)").fill("Disponible le soir, poste ST.");
      await player.getByRole("button", { name: "Candidater" }).click();
      await expect(player).toHaveURL(/application=sent/);
      await expect(player.getByText("Candidature envoyée au club.")).toBeVisible();

      const manager = await ownerContext.newPage();
      await login(manager, owner.email);
      await manager.goto(clubPath + "/manage/applications");
      await expect(manager.getByRole("heading", { name: "Candidatures" })).toBeVisible();
      await expect(manager.getByText("Disponible le soir, poste ST.")).toBeVisible();
      await expect(manager.getByRole("heading", { name: candidate.handle })).toBeVisible();
      await manager.getByRole("button", { name: "Accepter" }).click();
      await expect(manager.getByText("Le joueur a rejoint ton club.")).toBeVisible();

      await player.goto(clubPath);
      await expect(player.getByText(candidate.handle)).toBeVisible();
      await expect(player.getByRole("button", { name: "Candidater" })).toHaveCount(0);
    } finally {
      await applicantContext.close();
      await ownerContext.close();
    }
  });
});
