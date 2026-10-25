# ADR-0012 — Observabilité

- **Statut :** 🟡 VALIDÉ SOUS RÉSERVE. Revue v3 favorable (Selim, 25/10 22:02). **Réserve maintenue** : levée après preuve que `pnpm dev` et `pnpm build` fonctionnent **sans aucune variable Sentry** (job CI dédié + journal local joints).
- **Date :** 25/10/2026 · **Révision :** v3

## Décision
1. **Sentry entièrement optionnel et piloté par l'environnement.**
   - Initialisé **uniquement** si `NEXT_PUBLIC_SENTRY_DSN` est défini **et** que `SENTRY_ENABLED=true`. Sinon, c'est un no-op : aucun appel réseau, aucune erreur, aucun avertissement bloquant.
   - **Désactivé par défaut en local** et en CI.
   - Upload des source maps **seulement** si `SENTRY_AUTH_TOKEN` est présent. Son absence n'échoue jamais le build.
   - Taux d'échantillonnage (`SENTRY_TRACES_SAMPLE_RATE`) et environnement (`SENTRY_ENVIRONMENT`) configurables.
2. **Confidentialité** : `sendDefaultPii: false` ; filtrage (`beforeSend`) des emails, tokens, cookies, en-têtes d'autorisation et corps de messages ; identifiant utilisateur pseudonymisé au plus.
3. **Abstraction** : `lib/observability` expose `captureError`, `captureMessage` et `logEvent`. Le code métier n'importe jamais Sentry directement, ce qui permet de changer d'outil sans refonte.
4. **Toujours actif, même sans Sentry** : codes d'erreur métier stables, journal serveur structuré (console → logs Vercel), métriques des jobs d'expiration côté SQL.

## Preuves attendues (Phase 1)
- Job CI : `pnpm build` et tests réussis **sans aucune variable Sentry**.
- Démarrage local (`pnpm dev`) sans aucune variable Sentry, sans erreur.
- Avec un DSN de test sur Preview : une erreur volontaire remonte, sans PII.

## Conséquences
Le compte Sentry n'est pas un prérequis du GO Phase 1. Il devient requis avant la production (Phase 7).
