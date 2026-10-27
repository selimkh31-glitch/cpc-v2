# CPC V2 — 22 · MASTER PLAN PHASE 2 (produit)

**Statut :** PLAN, soumis à validation. **Aucun code fonctionnel, aucune migration, aucun déploiement** avant le GO spécifique de Selim pour chaque lot.
**Date :** 27/10/2026 · **Base :** `main` `a492eee`.
**Sources, par ordre de priorité :** décisions de Selim (registre `docs/02`) → `docs/source/CPC_V2_PRODUCT_SPEC.md` → `docs/reference/CPC_Cahier_UX_V1_Reference.md` → ADR 0001–0017 → `docs/04` (schéma proposé) → `docs/06` (backlog). Aucune fonctionnalité hors de ces sources.
**État officiel :** Phase 1 / G2 **HOLD** (`docs/21`). Ce plan ne vaut pas validation de la Phase 1.

> **Vocabulaire.** « Phase 2 produit » regroupe ici les phases 2 (Clubs), 3 (Radar et LIVE) et 4 (Explorer) du backlog `docs/06`, précédées d'un chantier de design system. Les phases 5 (Social et Safety), 6 (Pro) et 7 (Release) restent hors de ce plan. Les lots sont nommés **P2-0 à P2-K** ; chaque story garde sa référence `S-x.y` du backlog pour la traçabilité.

---

## 1. État exact de la V2 (27/10/2026)

### 1.1 Livré et vérifié
| Domaine | Contenu | Preuve |
|---|---|---|
| Socle | Next.js 16.4.3 App Router, TS strict, Tailwind v4, next-intl (FR), Zod 4, `@supabase/ssr` 0.12.7, pnpm | CI `main` verte (5 checks) |
| Sécurité plateforme | CSP à nonce par requête, en-têtes durcis, proxy de session, `getClaims()` côté serveur, D-38 (`rls_auto_enable` durcie), privilèges par défaut fermés (A-2), D-40 (`api.assert_session_active`) | pgTAP 97/97 ; H1–H5 staging PASS |
| Auth | Email + mot de passe, confirmation, mot de passe oublié, déconnexion, retour au contexte (AUTH-05), `/admin` en 404, envoi unique des formulaires (A-3) | e2e `auth-flows` |
| Onboarding | `api.complete_onboarding` (pseudo, plateforme, poste principal + ≤ 3 secondaires, âge déclaré) idempotent | pgTAP 050 + e2e |
| Profil | Lecture ; édition présentation, gamertag (déclaratif), avatar en bucket privé + URL signées 10 min | pgTAP 060, ST1–ST6 staging PASS |
| Shell | En-tête (emplacements vides), barre 3 onglets, safe areas, PWA standalone, états UX (skeleton, vide, erreur, hors ligne, pending) | e2e navigation, states, legal-pwa |
| Infra | Staging Supabase isolé ; Preview Vercel protégée (seule `preview` construit) ; ruleset `main` | `docs/20`, `docs/21` |

**Base de données :** 9 migrations. Tables : `profiles`, `profile_positions`, `account_settings`, `private.staff_members`, `private.idempotency_keys`, `private.rate_limits`. Fonctions `api` : `complete_onboarding`, `assert_session_active`. Bucket : `avatars`. Canal Realtime `user:{uid}`.

### 1.2 Absent
Clubs, affiliations, candidatures, invitations, Radar, LIVE, terrain, Explorer (page vide), profil d'autrui, notifications, blocages, messagerie, avis, EA (aucun provider), Pro, suppression de compte, Google OAuth.

### 1.3 Dette de design (constat)
- `src/components/ui/` est **vide** : shadcn/ui (ADR-0006) n'a jamais été installé.
- Tokens provisoires : `#ffffff` / `#171717`, un seul rayon, aucune échelle typographique, aucune élévation.
- Écrans composés de formulaires empilés et de cartes à bordure : c'est le « web générique à grandes cartes blanches » que Selim veut quitter.
- Icônes : 3 SVG écrits à la main dans `tab-bar.tsx`.

---

## 2. Écart avec le cahier UX

Légende : ✅ conforme · 🟡 partiel · ❌ absent · ⏸ hors Phase 2 produit.

| Écran / exigence (cahier) | État | Écart | Lot |
|---|---|---|---|
| §1 Principes : 3 onglets, pas d'onglet Messages | ✅ | — | — |
| §2 En-tête : Radar, messages, notifications | 🟡 | emplacements vides | P2-B (notifications), P2-G (Radar), ⏸ messages |
| §2 Panneau inférieur (sheet) pour détails rapides | ❌ | aucun composant sheet | P2-A |
| ACC-01 Accueil sans session | 🟡 | état « compte neuf » seulement ; ni club actif, ni Radar, ni suggestions | P2-A (forme), P2-C, P2-G, P2-J |
| ACC-02 Accueil en session | ❌ | — | P2-H |
| §3 Priorités d'Accueil + anti-doublon | ❌ | — | P2-J |
| §4 Radar 30/60/120 + pastille d'en-tête | ❌ | — | P2-G |
| EXP-01 Jouer | ❌ | — | P2-J |
| EXP-02 Clubs | ❌ | — | P2-F |
| EXP-03 Joueurs (manager) | ❌ | — | P2-J |
| §5 Filtres par intention, chips, scroll conservé | ❌ | — | P2-F |
| Candidatures (cartes, accepter/refuser) | ❌ | « Discuter » dépend de la messagerie | P2-D (⏸ Discuter) |
| LIV-01 Terrain et banc | ❌ | — | P2-I |
| LIV-02 Gérer la session (formation, AUTOFILL, invitations, demandes, terminer) | ❌ | COMBLER réservé au Pro | P2-H, P2-I (⏸ COMBLER) |
| Admission, invitations LIVE, départ, fermeture, prolongation | ❌ | — | P2-H |
| PRO-01 Profil personnel | 🟡 | manquent : cartes stats EA (« Données indisponibles »), clubs, Mes invitations, paramètres séparés, édition des postes, édition en panneaux courts | P2-A, P2-C, P2-D, P2-K |
| PRO-02 Profil d'autrui | ❌ | — | P2-D |
| Réputation / avis vérifiés | ❌ | dépend des feuilles finalisées + D-31 | ⏸ Phase 5 |
| §8 Affiliations PRIMARY/SECONDARY, inversion | ❌ | — | P2-C |
| CLB-01 Fiche club · CLB-02 Effectif · CLB-03 Fiche membre | ❌ | — | P2-C, P2-E |
| CLB-04 Gérer le club | ❌ | — | P2-C, P2-D, P2-E |
| INV-01 Mes invitations · INV-02 Invitations envoyées | ❌ | — | P2-D |
| §10 Gouvernance (rôles, transfert, OWNER protégé) | ❌ | — | P2-E |
| §11 Messages | ❌ | — | ⏸ Phase 5 |
| §11 Notifications (centre unifié) | ❌ | socle en P2-B, centre complet en Phase 5 | P2-B (socle) |
| §11 Signalement, blocage (UI), suppression de compte | ❌ | blocage appliqué côté serveur dès P2-B | ⏸ Phase 5 (UI) |
| §12 États transversaux | 🟡 | kit présent, non stylé, sans « conflit concurrent » ni « expiré » appliqués | P2-A |
| §12 Accessibilité, Reduce Motion | ✅ | à préserver dans le nouveau design | P2-A |

---

## 3. Architecture cible

L'architecture validée (`docs/03`, ADR 0001–0017) **ne change pas**. Le plan ajoute trois règles d'exécution.

### 3.1 Couches
```text
src/app/(app)/…                 écrans (Server Components) : lecture RLS, composition
src/components/ui/              primitives du design system (P2-A), sans logique métier
src/components/patterns/        compositions réutilisables (ListSection, ProfileHero, ClubCard, LivePill…)
src/features/<domaine>/
   contract.ts                  Zod : entrées et sorties des RPC (écrit EN PREMIER dans chaque lot)
   queries.ts                   lectures serveur (RLS)
   actions.ts                   Server Actions → api.* (idempotence, erreurs codées)
   rules.ts                     règles pures testées en Vitest (priorités d'Accueil, AUTOFILL…)
   components/                  composants propres au domaine
supabase/migrations/            une migration par story ; nom aligné sur la version du staging
supabase/tests/database/        pgTAP par table et par commande (P2–P6)
tests/race/                     scripts multi-connexions (C1–C11)
tests/e2e/                      Playwright iPhone / Pixel / Desktop + axe
```

### 3.2 Règles ajoutées
1. **Contrat d'abord.** Chaque lot commence par une PR « contrat » : signatures `api.*`, codes d'erreur, schémas Zod, matrice RLS des nouvelles tables. Les agents DB et UI travaillent ensuite en parallèle sur ce contrat.
2. **Aucune fonctionnalité visible sans donnée réelle.** Un emplacement sans backend n'affiche ni bouton ni chiffre. Pas de « bientôt disponible » déguisé en fonctionnalité.
3. **Design system obligatoire.** Plus aucun écran ne compose de classes Tailwind brutes pour des surfaces, boutons ou listes : il passe par `components/ui` et `components/patterns` (P2-A).

### 3.3 Routes (ADR-0005, inchangé)
`/home` · `/explore/{play,clubs,players}` · `/profile` · `/profile/invitations` · `/clubs/new` · `/clubs/[clubId]` · `/clubs/[clubId]/manage` · `/live/[sessionId]` · `/players/[playerId]` · `/notifications` · `/settings` · `/settings/account`.
Les sous-pages de gestion (`/clubs/[clubId]/manage/{applications,invitations,members,settings}`) nécessitent une **mise à jour d'ADR-0005**, prévue dans le contrat de P2-C.

### 3.4 Temps réel (ADR-0008)
`user:{uid}` (existant) → notifications, invitations, candidatures · `club:{clubId}` (P2-C) → effectif, gestion · `live:{sessionId}` (P2-H) → session, terrain. Signal seulement, puis refetch canonique.

---

## 4. Lots de la Phase 2 produit

Chaque lot est **autonome** : il livre DB + RLS + commandes + UI + tests, démontrable sur la Preview iPhone. Il se ferme par la gate standard de `docs/06` (lint, typecheck, build, Vitest, pgTAP, e2e, gitleaks, no-v1, démo Preview, rapport).

| Lot | Titre | Stories (backlog) | Exigences | Prérequis | Taille |
|---|---|---|---|---|---|
| **P2-0** | Décisions et cadrage | — | — | — | aucun code |
| **P2-A** | Design system et shell premium iPhone | S-1.7/1.8 (refonte) | §1, §2, §12, UX-01..04 | GO P2-A, D-41, D-42 | M |
| **P2-B** | Socle domaine : helpers, blocages, notifications, club actif | S-2.1 (partiel), S-2.11, S-2.12 | NOT-01 (socle), SAF-01 (serveur) | P2-0 | M |
| **P2-C** | Clubs : création, fiche, effectif, paramètres, mes clubs | S-2.2, S-2.3, S-2.7, S-2.8 | CLB-01..06 | P2-A, P2-B, D-21, D-23 | L |
| **P2-D** | Recrutement : candidatures, invitations, profil d'autrui | S-2.4, S-2.5, S-2.6 + PRO-02 | APP-01..04, INV-01..04, PRO-02 | P2-C, D-13, D-22 | L |
| **P2-E** | Gouvernance : rôles, retrait, transfert, dissolution | S-2.9, S-2.10 | CLB-07/08/09 | P2-D, D-06a | M |
| **P2-F** | Explorer : structure + Clubs | S-4.2, S-4.4 | EXP-01/02/04 | P2-D | M |
| **P2-G** | Radar | S-3.1, S-3.2 (Radar) | RAD-01..03 | P2-B, D-01, D-01b | S |
| **P2-H** | LIVE : sessions et admissions | S-3.2..S-3.7 | LIV-01/02/07..10, ACC-02 | P2-C, P2-G, D-02, D-24, D-26, D-28, D-29, D-03, D-11b | L |
| **P2-I** | Terrain et banc (Match Manager) | S-3.9..S-3.12 | LIV-03..05 | P2-H, D-25, D-27 | L |
| **P2-J** | Accueil contextuel + Explorer Jouer / Joueurs | S-3.8, S-4.1, S-4.3 | ACC-01..04, EXP-03/05, RAD-03 | P2-H, D-11 | M |
| **P2-K** | Profil enrichi : postes, parcours, stats EA indisponibles, paramètres | S-4.5 (partie EA) + PRO-05 | PRO-01/02/05 | P2-C | S |

**Hors Phase 2 produit (⏸) :** messagerie et « Discuter » (Phase 5), centre de notifications complet et préférences (Phase 5), UI de blocage et de signalement, modération (Phase 5), avis et réputation (Phase 5, D-31), suppression de compte (Phase 5), COMBLER et Pro (Phase 6), EA réel (D-04), Google OAuth (décision distincte), alertes enregistrées (S-4.7).

### Détail des lots

#### P2-0 — Décisions et cadrage (Selim, aucun code)
À trancher avant le lot indiqué (registre `docs/02`) :

| Avant | Décisions |
|---|---|
| P2-A | **D-41** direction visuelle (§ « Brief P2-A », `docs/23`) · **D-42** ajout de dépendances UI (`@radix-ui/*` via shadcn, `lucide-react`) |
| P2-C | D-21 création de club · D-23 visibilité des clubs · **D-43** blasons (bucket `crests` privé, ADR-0015) |
| P2-D | D-13 remplacement du SECONDARY si OWNER/manager · D-22 durées d'expiration |
| P2-E | D-06a dissolution |
| P2-G | D-01, D-01b |
| P2-H | D-02, D-24, D-26, D-28, D-29, D-03, D-11b |
| P2-I | D-25 formations, D-27 feuille finalisée |
| P2-J | D-11 « manager autorisé » |

Et une **mise à jour de `CLAUDE.md`** (« Phase en cours ») au premier GO de développement.

#### P2-A — Design system et shell premium iPhone (premier chantier)
UI seulement, **aucune migration**. Brief complet : `docs/23`.

#### P2-B — Socle domaine
- **DB :** helpers `private.uid()`, `is_onboarded`, `is_blocked_between`, `has_active_sanction` (stub : `false` tant qu'il n'y a pas de sanctions, documenté) ; `public.user_blocks` (sans UI) ; `public.notifications` + broadcast `user:{uid}` ; `account_settings.active_club_id` (FK posée en P2-C).
- **Modification d'une policy existante :** `profiles` SELECT ajoute « non bloqué » (B).
- **UI :** cloche dans l'en-tête avec badge non lu, réel ; page `/notifications` en liste simple (lu / non lu, CTA invalides désactivés).
- **Tests :** pgTAP P2 sur `user_blocks` et `notifications`, P4/P5 globaux, e2e badge.

#### P2-C — Clubs
- **DB :** `clubs`, `club_memberships` (exclusions différables PRIMARY/SECONDARY et OWNER), `private.membership_events`, helpers `is_club_member/manager/owner`, bucket `crests`, canal `club:{id}` ; commandes `create_club`, `update_club`, `swap_primary_secondary`, `leave_club`, `set_active_club`.
- **UI :** `/clubs/new` (formulaire en étapes courtes) ; `/clubs/[id]` fiche (hero blason + identité, recrutement, postes recherchés en chips, effectif groupé GK/DEF/MID/ATT, rôle visible) ; « Gérer le club » visible seulement si habilité (contrôle serveur) ; `/clubs/[id]/manage/settings` ; Profil > Mes clubs (inversion PRIMARY/SECONDARY en sheet de confirmation) ; sélecteur de club actif dans l'en-tête.
- **Tests :** pgTAP P2–P6 ; courses **C7, C8** ; e2e création → fiche → paramètres ; T-10 (partie update).

#### P2-D — Recrutement
- **DB :** `club_applications`, `club_invitations` ; commandes `apply_to_club`, `withdraw_application`, `decide_application`, `confirm_membership_replacement`, `invite_to_club`, `cancel_club_invitation`, `respond_club_invitation` ; notifications associées ; blocage appliqué.
- **UI :** sheet « Candidater » (message facultatif) ; Gérer > Candidatures (cartes compactes, fiche, Accepter / Refuser) ; Gérer > Invitations (statuts, annuler) ; `/profile/invitations` (En attente / Historique) ; consentement au remplacement du SECONDARY (sheet dédiée) ; **profil d'autrui `/players/[id]`** (PRO-02, sans Message ni Signaler tant que la Phase 5 n'est pas livrée) avec « Inviter dans un club que je gère ».
- **Tests :** **T-01, T-02**, C6, C7 ; pgTAP doublons et BLOCKED ; e2e deux comptes.

#### P2-E — Gouvernance
- **DB :** `ownership_transfers` ; `set_member_role`, `remove_member`, `propose/cancel/respond_ownership_transfer`, `dissolve_club`.
- **UI :** Gérer > Membres (fiche membre contextuelle CLB-03 en sheet ; OWNER protégé visible) ; transfert : proposition, réponse du successeur, états ; dissolution (OWNER seul).
- **Tests :** **T-09, T-10**, C5 ; invariant « exactement 1 OWNER par club actif ».

#### P2-F — Explorer : structure + Clubs
- **DB :** `api.search_clubs(filters)` (blocages, clubs actifs, pagination par curseur).
- **UI :** contrôle segmenté **Jouer / Clubs**, plus **Joueurs** seulement si `is_authorized_scout` (sinon absent) ; filtres fréquents visibles + panneau + chips effaçables ; filtres dans l'URL ; scroll conservé ; cartes compactes ; fiche rapide en sheet ; états fermé / déjà membre / déjà candidat / deux affiliations. Jouer affiche un état vide véridique jusqu'à P2-J.
- **Tests :** e2e filtres + retour arrière (EXP-01) ; pgTAP blocage.

#### P2-G — Radar
- **DB :** `radar_sessions`, `start_radar`, `stop_radar`, `pg_cron` `private.job_expire_all` (Radar d'abord), rate limit D-01b.
- **UI :** pastille d'en-tête persistante (temps restant calculé depuis `server_now`) ; sheet d'activation 30/60/120 (120 par défaut) avec confirmation ; arrêt manuel.
- **Tests :** e2e « reload ≠ activation » ; T-16 (partie Radar) ; C9 préparé.

#### P2-H — LIVE : sessions et admissions
- **DB :** `live_sessions`, `live_participants`, `live_requests`, `live_invitations` ; commandes `start_live_session`, `join_club_live`, `request_live_access`, `decide_live_request`, `invite_to_live` (source `manual` seulement), `cancel_live_invitation`, `respond_live_invitation`, `leave_live_session`, `remove_live_participant`, `extend_live_session`, `close_live_session` ; canal `live:{id}` ; extension de `job_expire_all`.
- **UI :** `/live/[sessionId]` (en-tête LIVE avec halo néon modéré, temps restant serveur) ; file des demandes avec compteur (sheet) ; invitations ; prolonger (30/60/120) ; terminer (confirmation + nombre de participants) ; **Accueil en session (ACC-02)**.
- **Tests :** **T-03, T-04, T-06, T-07, T-08**, C2, C3, C4, C9 ; e2e deux navigateurs (Realtime + refetch).

#### P2-I — Terrain et banc
- **DB :** `lineup_assignments`, `private.lineup_events`, `lineup_snapshots` ; `lineup_assign/swap/unassign/set_formation/autofill` avec `expected_revision`.
- **UI (pièce maîtresse premium) :** terrain vertical plein écran par formation, banc sous les titulaires ; tap joueur → tap poste ; swap confirmé ; retour au banc ; AUTOFILL (gratuit) ; conflit → état canonique + explication ; Reduce Motion respecté. COMBLER **absent** (Phase 6).
- **Tests :** **T-05** (C1, courses réelles) ; Vitest exhaustif sur `rules.ts` (AUTOFILL) ; snapshot finalisé ; revue visuelle iPhone.

#### P2-J — Accueil contextuel + Explorer Jouer / Joueurs
- **DB :** `search_open_sessions`, `search_available_players` (D-11, Radar disponible hors session, B).
- **UI :** Accueil avec priorités strictes (`rules.ts`) : session en cours > invitation LIVE urgente > LIVE du club / action manager > Explorer / Radar ; une seule action dominante ; anti-doublon. Explorer Jouer (demander l'accès) ; Explorer Joueurs (inviter LIVE / club).
- **Tests :** Vitest des priorités (toutes combinaisons) ; **T-16, T-11** ; e2e.

#### P2-K — Profil enrichi
- **DB :** `api.set_positions` ; lecture de l'historique d'affiliations (parcours véridique).
- **UI :** profil en sections (hero, postes, présentation, gamertag « déclaré », carte Statistiques EA « Données indisponibles » via `EAProvider` `Unavailable`, clubs, parcours) ; édition par panneaux courts en sheet ; `/settings` séparé (déconnexion, compte).
- **Tests :** **T-12** ; e2e édition des postes ; a11y.

---

## 5. Schémas Supabase et RLS par lot

Référence détaillée : `docs/04` (colonnes, contraintes, matrice). Ce tableau fixe **quoi créer, et quand**. Chaque commande respecte ADR-0004 (R1–R4) ; chaque table a sa matrice P2 testée.

| Lot | Tables / objets | RLS (SELECT authenticated ; écritures) | Commandes `api.*` | Autres |
|---|---|---|---|---|
| P2-B | `user_blocks` · `notifications` · `account_settings.active_club_id` · helpers `private.*` | blocks : soi (bloqueur) ; cmd. notifications : soi ; UPDATE soi (`read_at`) ; INSERT ∅ (système). **Policy `profiles` modifiée : + non bloqué** | `block_user`/`unblock_user` (serveur, sans UI), `mark_notifications_read` | trigger broadcast `user:{uid}` |
| P2-C | `clubs` · `club_memberships` · `private.membership_events` · bucket `crests` | clubs : actifs ; cmd. memberships : actives pour tous, inactives soi + managers ; cmd | `create_club`, `update_club`, `swap_primary_secondary`, `leave_club`, `set_active_club` | exclusions DEFERRABLE ; canal `club:{id}` ; policies Storage `crests` (S1–S9) |
| P2-D | `club_applications` · `club_invitations` | soi + managers du club ciblé ; cmd | `apply_to_club`, `withdraw_application`, `decide_application`, `confirm_membership_replacement`, `invite_to_club`, `cancel_club_invitation`, `respond_club_invitation` | uniques partiels (1 active) ; expiration via job (P2-G) ou filtre `expires_at` |
| P2-E | `ownership_transfers` | from/to + managers ; cmd | `set_member_role`, `remove_member`, `propose/cancel/respond_ownership_transfer`, `dissolve_club` | invariant 1 OWNER testé |
| P2-F | — | — | `search_clubs` (lecture) | index de recherche |
| P2-G | `radar_sessions` | **soi uniquement** ; cmd | `start_radar`, `stop_radar` | `pg_cron` → `private.job_expire_all` |
| P2-H | `live_sessions` · `live_participants` · `live_requests` · `live_invitations` | `docs/04` §4 (membres, participants, découverte active hors blocage) ; cmd | 11 commandes (§4) | canal `live:{id}` ; uniques partiels D-02 / D-24 |
| P2-I | `lineup_assignments` · `private.lineup_events` · `lineup_snapshots` | participants + managers ; cmd | `lineup_*` | `lineup_revision` (verrou optimiste) |
| P2-J | — | — | `search_open_sessions`, `search_available_players` | `is_authorized_scout`, `is_radar_available` |
| P2-K | — | — | `set_positions` | — |

**Garanties existantes à ne pas perdre :** D-38 (`rls_auto_enable`, `ensure_rls`) · privilèges par défaut fermés (A-2) · aucune fonction `api`/`private` exécutable par PUBLIC/anon (P4) · `search_path=''` (P5) · `anon` sans aucun privilège de table · bucket privé + URL signées (ADR-0015) · D-40 sur les actions sensibles (transfert, dissolution, retrait de membre, clôture LIVE) · aucune clé secrète côté navigateur · `admin.ts` limité aux webhooks.

---

## 6. Plan de tests par lot

| Lot | pgTAP (P2–P6, P8) | Courses (`tests/race/`) | E2E Playwright (iPhone WebKit + Chromium) | Vitest | Visuel / a11y |
|---|---|---|---|---|---|
| P2-A | — (aucune DB) | — | shell, sheet unique, onglets, retour arrière, Reduce Motion, CSP sans violation | utilitaires de tokens | axe 0 critique/sérieux ; captures iPhone clair/sombre jointes à la PR ; contraste AA |
| P2-B | `user_blocks`, `notifications`, `profiles`+B, P4/P5 globaux, P8 `user:` | — | badge non lu, `/notifications` | — | axe |
| P2-C | `clubs`, `club_memberships`, 5 commandes × personas, invariants ≤ 2 adhésions / 1 OWNER, Storage `crests` | **C7, C8** | création → fiche → paramètres ; inversion PRIMARY/SECONDARY | règles de groupement de l'effectif | captures fiche club |
| P2-D | 7 commandes, doublons, BLOCKED, IDOR | **C6, C7** | **T-01, T-02**, Mes invitations | — | captures candidatures |
| P2-E | 6 commandes, OWNER protégé, escalade | **C5** | **T-09, T-10** | — | — |
| P2-F | `search_clubs` (blocage, clubs dissous exclus) | — | filtres + chips + retour (scroll conservé) | sérialisation URL des filtres | captures Explorer |
| P2-G | `radar_sessions` soi uniquement, rate limit, expiration | C9 (préparé) | reload ≠ activation, pastille, expiration | décalage d'horloge `server_now` | — |
| P2-H | 4 tables, 11 commandes, P8 `live:` | **C2, C3, C4, C9** | **T-03, T-04, T-06, T-07, T-08**, deux navigateurs | — | captures session |
| P2-I | `lineup_*`, révision, snapshot | **C1 (T-05)** | placement tactile, swap, retour banc, AUTOFILL | `rules.ts` AUTOFILL exhaustif | revue terrain iPhone |
| P2-J | 2 recherches (D-11, B, hors session) | — | **T-16, T-11**, priorités d'Accueil | priorités ACC (toutes combinaisons) | captures Accueil |
| P2-K | `set_positions` | — | édition des postes, **T-12** | — | axe |

**Règles inchangées :** inventaire P1–P10 / C1–C11 non négociable (ADR-0011) ; aucun PASS sans sortie d'exécution ; staging uniquement avec comptes `qa_*@example.test`, supprimés en fin de campagne.

---

## 7. Ordre d'implémentation optimal

```text
P2-0 (décisions, en continu)
  │
  ├─► P2-A  design system + shell ─────────────┐   (UI seule : en parallèle de P2-B)
  └─► P2-B  socle domaine ─────────────────────┤
                                               ▼
                                     P2-C  Clubs
                                               ▼
                                     P2-D  Recrutement ─────┬─► P2-E Gouvernance
                                               │            └─► P2-F Explorer Clubs
                                               ▼
                                     P2-G  Radar (peut démarrer dès P2-B)
                                               ▼
                                     P2-H  LIVE sessions
                                               ▼
                                     P2-I  Terrain
                                               ▼
                                     P2-J  Accueil contextuel + Explorer Jouer/Joueurs
P2-K Profil enrichi : en parallèle, dès que P2-C est fusionné.
```

**Pourquoi le LIVE ne peut pas passer avant les clubs :** une session LIVE appartient à un club (`live_sessions.club_id`), ses droits viennent des rôles du club (manager, D-26) et ses participants externes viennent du Radar (D-28). L'**Accueil premium** arrive, lui, dès P2-A, avec ses états réels ; il s'enrichit à chaque lot.

**Gates :** G3 après P2-E (courses C5–C8 rejouées) · G4 après P2-I (C1–C4, C9 ; démo à deux téléphones) · G4b après P2-J (Explorer sans donnée inventée).

### Exécution multi-agents
| Rôle | Périmètre de fichiers | Entrées | Sorties |
|---|---|---|---|
| **Lead** | `docs/`, `contract.ts`, ADR, intégration, PR | brief du lot, décisions | PR contrat, rapport de gate |
| **Agent DB** | `supabase/migrations`, `supabase/tests`, `tests/race` | contrat | migrations + pgTAP + courses |
| **Agent UI** | `src/components`, `src/app`, `src/features/*/components`, `messages` | contrat + design system | écrans + Vitest |
| **Agent QA** | `tests/e2e`, captures, rapports | Preview + comptes qa | e2e, axe, captures, rapport iPhone |

Règles : une PR par story ; aucun agent ne modifie les fichiers d'un autre rôle sans passer par le Lead ; le contrat est fusionné avant les PR DB et UI du lot ; fusion par Selim (ou sur son GO explicite) ; migration appliquée au staging **après** fusion (D-35).

---

## 8. Premier chantier UI visible sur iPhone

**P2-A — Design system et shell premium.** Il est le seul qui :
- change immédiatement l'expérience sur l'iPhone (shell, Accueil, Profil, auth, onboarding) ;
- ne demande **aucune migration** ni aucune décision métier ouverte ;
- conditionne la qualité de tous les lots suivants (aucun écran n'est refait deux fois).

Brief d'exécution complet : **`docs/23_BRIEF_P2A_DESIGN_SYSTEM.md`**.

---

## 9. Décisions demandées à Selim

| ID | Décision | Recommandation |
|---|---|---|
| GO-P2A | Lancer P2-A (UI seule, sans DB) | ✅ GO (27/10, 19:27) |
| D-41 | Direction visuelle « Stade de nuit » (`docs/23` §2) | ✅ palette noir, vert, blanc, gris |
| D-42 | Dépendances UI : shadcn/ui (Radix, déjà prévu par ADR-0006) + `lucide-react` (icônes, licence ISC) | ✅ |
| D-43 | Blasons de club en bucket privé `crests` | 🔵 valider avant P2-C |
| D-21, D-23 | Création et visibilité des clubs | trancher avant P2-C |
| CLAUDE.md | Passage « Phase en cours » à la Phase 2 produit | ✅ fait avec le GO P2-A (lot P2-A uniquement) |
