# ADR-0017 — Rendu dynamique et Cache Components

- **Statut :** ✅ VALIDÉ (Selim, 26/10/2026 00:18)
- **Contexte :** `create-next-app` 16.4.3 active par défaut `cacheComponents` et `partialPrefetching`. La documentation embarquée de Next.js (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`) indique que **le Partial Prerendering est incompatible avec une CSP à nonce** : les scripts du shell statique ne reçoivent pas le nonce. Or ADR-0002 v3 retient une CSP stricte à nonce comme compensation XSS (cookies de session lisibles par le JS).

## Décision
1. `cacheComponents` et `partialPrefetching` **désactivés** (ce sont des options opt-in).
2. CSP à nonce posée par `src/proxy.ts`, régénérée à chaque requête ; `'strict-dynamic'`, aucun `'unsafe-inline'`, `'unsafe-eval'` uniquement en développement.
3. Rendu **dynamique** de toutes les pages : `await connection()` dans le layout racine. Le build affiche toutes les routes en `ƒ (Dynamic)`.

## Alternatives écartées
| Option | Raison du rejet |
|---|---|
| Garder Cache Components + CSP sans nonce (`'unsafe-inline'`) | Affaiblit la protection XSS exigée par ADR-0002 |
| Garder Cache Components + CSP par hash (SRI) | Fonction **expérimentale** de Next.js, ne couvre pas les scripts dynamiques |

## Conséquences
- Pas de shell statique : chaque page est rendue à la requête. Acceptable : CPC est une application majoritairement authentifiée, et ADR-0002 impose déjà `no-store` sur les pages privées.
- Performance à mesurer en Phase 7 (D-10). Réévaluable si Next.js stabilise une CSP compatible avec le prerendering.
- Preuves : test unitaire `tests/unit/csp.test.ts` ; test e2e `tests/e2e/smoke.spec.ts` (nonce présent, unique par requête, aucune violation CSP en console).
