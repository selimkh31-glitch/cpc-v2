# CPC V2 — Index des ADR (v3.1, 25/10/2026 après revue de 22:02)

| ADR | Sujet | Statut | Reste à faire |
|---|---|---|---|
| [0001](ADR/0001-stack.md) | Stack applicative | ✅ | — |
| [0002](ADR/0002-auth-boundary.md) | Frontière d'authentification | 🟡 | v3 revue favorable ; réserve levée après A1–A8 exécutés intégralement, avec preuves |
| [0003](ADR/0003-supabase-boundary.md) | Frontière Supabase, SQL sans ORM | ✅ | — |
| [0004](ADR/0004-mutation-model.md) | Commandes transactionnelles | 🟡 | Réserves R1–R4 prouvées **commande par commande** (permanent) |
| [0005](ADR/0005-routes.md) | Convention de routes | ✅ | — |
| [0006](ADR/0006-ui-components.md) | Composants UI | ✅ | À recroiser avec le cahier UX |
| [0007](ADR/0007-client-state.md) | État client | ✅ | — |
| [0008](ADR/0008-realtime.md) | Temps réel | ✅ | — |
| [0009](ADR/0009-jobs-ttl.md) | Jobs et échéances | ✅ | — |
| [0010](ADR/0010-i18n.md) | i18n (FR, next-intl) | ✅ | — |
| [0011](ADR/0011-testing-ci.md) | Tests et CI (inventaire P1–P10, C1–C11) | ✅ | — |
| [0012](ADR/0012-observability.md) | Observabilité, Sentry optionnel | 🟡 | v3 revue favorable ; réserve levée après preuve de dev et build sans Sentry |
| [0013](ADR/0013-pro-billing.md) | Pro et paiement | ⚪ | Avant la Phase 6 (V-10 ✅ : aucun prix dans le modèle) |
| [0014](ADR/0014-ea-provider.md) | Fournisseur EA | 🔵 défaut `Unavailable` · ⚪ source | Avant la Phase 4 |
| [0015](ADR/0015-media-storage.md) | Médias : buckets privés + URL signées | 🟡 | v3 revue favorable ; réserve levée après tests S1–S9 (policies, expiration, blocages) |
| [0016](ADR/0016-v1-isolation.md) | Isolation V1 | ✅ | — |
| [0017](ADR/0017-rendering-csp.md) | Rendu dynamique, Cache Components désactivé (CSP à nonce) | 🔵 | Validation Selim (PR-1) |

**Corrections v3** : 0002 (cookies non httpOnly, conformément à la doc `@supabase/ssr`, avec compensations et spike) · 0012 (Sentry piloté par variables d'environnement, no-op par défaut) · 0015 (buckets privés, URL signées de 10 min) · 0011 (inventaire explicite et non négociable) · 0004 (renvoi à l'inventaire conservé).
