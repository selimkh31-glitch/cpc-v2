# ADR-0005 — Convention de routes

- **Statut :** ✅ VALIDÉ (Selim, 25/10/2026 21:55 — orientation technique Lot 1 approuvée)
- **Date :** 25/10/2026

## Décision
Anglais, pluriel, identifiants explicites : `/home` (canonique ; `/` redirige selon la session), `/explore/{play,clubs,players}`, `/profile`, `/profile/invitations`, `/clubs/new`, `/clubs/[clubId]`, `/clubs/[clubId]/manage`, `/live/[sessionId]`, `/players/[playerId]`, `/messages`, `/messages/[conversationId]`, `/notifications`, `/settings`, `/settings/account`, `/login`, `/signup`, `/onboarding`, `/auth/callback`, `/legal/*`, `/admin/*`.
Filtres d'Explorer dans les `searchParams` (conservés au retour, EXP-01).

## Conséquences
Résout l'incohérence I-3 de l'audit (`/club` vs `/clubs`). Toute nouvelle route passe par une mise à jour de cet ADR.
