# CPC V2 — 14 · C-2 (JWT 10–15 min) : préparation des tests de compatibilité

**Statut C-2 :** ⏸ HOLD (Selim, 26/10/2026 09:12). Aucune modification de la durée des JWT.
**Ce document prépare uniquement** les tests à exécuter le jour où C-2 sera autorisé, contre un Vercel Preview relié au staging.

## Ce qui est déjà couvert en CI (Supabase local, JWT = 120 s, plus strict que 900 s)
| Scénario | Test | Résultat actuel |
|---|---|---|
| Rafraîchissement serveur après expiration | A1 (`auth-spike.spec.ts`) | ✅ |
| Rafraîchissement client | A2 | ✅ |
| Deux onglets qui rafraîchissent en même temps | A3 | ✅ |
| Realtime privé ré-authentifié | A4 | ✅ |
| Révocation immédiate des actions sensibles | A5b (D-40) | ✅ |

## Tests préparés pour le Preview — `tests/preview/c2-jwt-compat.spec.ts`
| ID | Vérifie |
|---|---|
| C2-1 | durée restante du JWT ≈ valeur configurée (`C2_EXPECTED_JWT_TTL`, 900 par défaut) |
| C2-2 / C2-3 | après expiration, deux onglets rechargés en même temps restent connectés, avec un nouveau `exp` |
| C2-4 | canal Realtime privé ré-abonné après rafraîchissement |
| C2-5 | une action sensible reste acceptée (pas de faux refus D-40) |

Le projet Playwright `preview-c2` n'existe que si `E2E_TARGET=preview` ; sinon les tests sont ignorés.

## Prérequis (actions de Selim, non autorisées à ce stade)
1. Vercel Preview du dépôt `cpc-v2` relié au staging, avec `ENABLE_AUTH_SPIKE=1` (page `/spike/session`).
2. Un compte synthétique `qa_*@example.test` sur le staging.
3. Secrets GitHub `E2E_BASE_URL`, `E2E_PREVIEW_EMAIL`, `E2E_PREVIEW_PASSWORD`. **Jamais dans Git.**
4. Autorisation de C-2, puis réglage *JWT expiry = 900* (Auth → Settings).

## Commande
`E2E_TARGET=preview E2E_BASE_URL=… E2E_PREVIEW_EMAIL=… E2E_PREVIEW_PASSWORD=… pnpm exec playwright test --project preview-c2`

## À surveiller après le passage à 900 s
- Journaux Auth : erreurs de limite de débit sur les rafraîchissements.
- Appareils dont l'horloge est décalée (mitigation `server_now`, ADR-0009).
- Retour arrière : remettre la valeur précédente du réglage.
