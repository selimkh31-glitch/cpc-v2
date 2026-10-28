# ADR-0005 — Convention de routes

- **Statut :** ✅ VALIDÉ (Selim, 25/10/2026 21:55 — orientation technique Lot 1 approuvée)
- **Date :** 25/10/2026

## Décision
Anglais, pluriel, identifiants explicites : `/home` (canonique ; `/` redirige selon la session), `/explore/{play,clubs,players}`, `/profile`, `/profile/invitations`, `/clubs/new`, `/clubs/[clubId]`, `/clubs/[clubId]/manage`, `/live/[sessionId]`, `/players/[playerId]`, `/messages`, `/messages/[conversationId]`, `/notifications`, `/settings`, `/settings/account`, `/login`, `/signup`, `/onboarding`, `/auth/callback`, `/legal/*`, `/admin/*`.
Filtres d'Explorer dans les `searchParams` (conservés au retour, EXP-01).

## Mise à jour P2-B (28/10/2026, contrat B0, `docs/26` §6)
- `/explore` redirige vers le dernier segment utilisé, sinon `/explore/clubs`.
- `/explore/clubs` et `/explore/play` : créées en P2-B. `/explore/play` affiche un état vide véridique jusqu'au LIVE (D-47).
- `/explore/players` : **réservée, non créée** tant que le Radar et D-11 n'existent pas (404).
- **Nouvelle route** `/clubs/[clubId]/manage/settings` : réglages et recrutement du club (OWNER et manager). Les autres sous-pages de gestion (`applications`, `invitations`, `members`) seront ajoutées par les lots qui les créent.
- `/clubs/[clubId]` et `/clubs/[clubId]/manage/*` renvoient **404**, que le club soit inexistant, invisible (D-23, blocage) ou non autorisé : pas d'oracle d'existence.

## Conséquences
Résout l'incohérence I-3 de l'audit (`/club` vs `/clubs`). Toute nouvelle route passe par une mise à jour de cet ADR.
