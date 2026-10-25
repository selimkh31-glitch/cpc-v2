# CPC V2 — 06 · Backlog de développement par phases testables

Chaque phase livre une **tranche verticale démontrable** (DB + RLS + commandes + UI + tests) et se ferme par une **gate GO/HOLD**. Aucune phase ne part en production automatiquement.
Notation : `S-x.y` = story, avec les exigences de la SPEC entre crochets, et les tests d'acceptation T-xx.

**Gate standard (toutes phases)** : lint + typecheck + build OK · Vitest et pgTAP verts · matrice RLS des nouvelles tables testée · démo réelle sur Preview (mobile et desktop) · aucun nouveau secret dans Git (gitleaks) · garde-fou V1 vert · registre des décisions à jour · rapport de phase. **Aucun « PASS » déclaré sans exécution.**

---

## Phase 0 — Préparation (aucun code)

| ID | Tâche | Responsable | Preuve |
|---|---|---|---|
| S-0.1 | ~~Valider les décisions Lot 1~~ : **fait le 25/10** (registre 02 v2), reste D-12 🟠 en stratégie temporaire | Selim | registre 02 v2 |
| S-0.2 | Joindre `CPC_Cahier_UX_V1_Reference.docx` (référence UX, V-09) à la doc du nouveau repo, et le transmettre à Claude pour le croiser avec le backlog | Selim | `docs/reference/` + revue Claude |
| S-0.3 | Créer le repo GitHub, le projet Supabase staging et le projet Vercel (checklist 07) | Selim | refs communiquées |
| S-0.4 | Vérifier l'isolation : refs ≠ V1, aucun secret V1, connecteur Supabase pointant le bon projet | Claude | rapport G1 |
| S-0.5 | ADR 0001–0016 rédigés (statuts dans ADR_INDEX) ; valider les 🔵 du Lot 1 | Claude → Selim | `docs/ADR/` |

**Gate G0/G1** : décisions Lot 1 validées · projets créés et isolés · ADR approuvés · **GO explicite de Selim pour coder**.

---

## Phase 1 — Fondations (Lot 1)

**Objectif démontrable** : un vrai utilisateur crée son compte, confirme son email, termine l'onboarding et navigue dans le shell 3 onglets avec tous les états UX.

| ID | Story | Acceptation |
|---|---|---|
| S-1.1 | Scaffold Next.js + TS strict + Tailwind v4 + shadcn/ui + next-intl + ESLint + Vitest + Playwright | build vert en CI |
| S-1.2 | CI GitHub Actions complète (lint, types, unit, Supabase local + pgTAP, build, e2e smoke, gitleaks, `check-no-v1`) | pipeline vert sur PR |
| S-1.3 | Migrations : extensions, schémas `api`/`private`, enums, `profiles`, `profile_positions`, `account_settings`, `notification_preferences`, idempotence, rate limits, helpers de base | pgTAP RLS identité |
| S-1.4a | **Spike auth** : scénarios A1–A8 d'ADR-0002 sur la version épinglée de `@supabase/ssr` ; attributs réels des cookies consignés dans l'ADR | Playwright vert, ADR-0002 → ✅ |
| S-1.4 | Auth email + mot de passe, confirmation, mot de passe oublié, déconnexion [AUTH-01] ; Google si D-05 = (b) [AUTH-02] | e2e inscription → confirmation → login |
| S-1.5 | Redirection vers le login puis retour au contexte d'origine [AUTH-05] ; `/admin` en `notFound` pour les non-staff | **T-14** (partie admin) |
| S-1.6 | Onboarding : pseudo, plateforme, poste principal et secondaires, confirmation d'âge [AUTH-03] via `complete_onboarding` | e2e + pgTAP |
| S-1.7 | Shell : header (emplacements Radar, messages, notifications), TabBar Accueil / Explorer / Profil, pages vides véridiques [§3] | e2e navigation mobile |
| S-1.8 | Kit d'états UX : skeleton, vide, erreur, timeout, hors ligne, interdit, expiré, conflit [UX-01] ; mutation = succès seulement après le serveur [UX-02] | storybook léger ou page `/dev/states` (non prod) |
| S-1.9 | Profil personnel : lecture et édition par panneaux (identité, postes, présentation) [PRO-05] ; avatar en bucket privé avec URL signées (ADR-0015) | e2e + tests Storage P7 |
| S-1.10 | Accessibilité de base : focus, cibles tactiles ≥ 44 px, reduced motion, contrastes [UX-03] | axe-core sans violation critique |
| S-1.11 | Pages légales (squelettes) et manifest PWA [SAF-03, D-08] | — |
| S-1.12 | Observabilité optionnelle (ADR-0012) : `lib/observability`, Sentry activé uniquement par variables d'environnement [UX-05] | build et dev OK **sans** variables Sentry ; erreur test remontée sur Preview si DSN fourni |

**Gate G2** : login réel, onboarding, 3 onglets, états, tests verts, démo Preview.

---

## Phase 2 — Clubs, affiliations, recrutement (Lot 2)

**Objectif démontrable** : un joueur crée un club, un autre candidate, il est accepté ; gestion des rôles, transfert de propriété, double affiliation.

| ID | Story | Acceptation |
|---|---|---|
| S-2.1 | Tables clubs, memberships (contraintes différées), applications, invitations, transfers, membership_events, **user_blocks**, **notifications** (socle) | pgTAP RLS + invariants |
| S-2.2 | Créer un club (D-21), fiche club, effectif groupé GK/DEF/MID/ATT [CLB-04/05] | e2e |
| S-2.3 | Gérer le club : paramètres et recrutement (postes recherchés) [CLB-06] | pgTAP FORBIDDEN hors club |
| S-2.4 | Candidater, retirer, accepter/refuser (atomique, idempotent) [APP-01/02] | **T-01** |
| S-2.5 | Remplacement du SECONDARY avec consentement préalable, règle R-1 [APP-03, CLB-02] | **T-02** |
| S-2.6 | Invitations permanentes : envoyer (choix du club géré), annuler, accepter/refuser ; Profil > Mes invitations (En attente / Historique) ; vue gestion [INV-01..04] | e2e + pgTAP doublons |
| S-2.7 | Inversion PRIMARY↔SECONDARY, club actif d'affichage [CLB-01/02] | pgTAP (jamais 2 PRIMARY) |
| S-2.8 | Quitter un club ; OWNER bloqué s'il reste des membres [CLB-03/08] | pgTAP |
| S-2.9 | Rôles : OWNER nomme/rétrograde des managers ; un manager ne peut exclure ni l'OWNER ni un manager [CLB-07/08] | **T-10** |
| S-2.10 | Transfert de propriété : proposer, refuser, accepter, expirer [CLB-07] | **T-09** (course incluse) |
| S-2.11 | Notifications in-app minimales (badge + liste) pour candidatures et invitations [NOT-01 partiel] | e2e |
| S-2.12 | Blocage appliqué côté serveur aux candidatures et invitations (UI de blocage en Phase 5) | pgTAP BLOCKED |

**Gate G3** : tests multi-rôles et affiliations verts, courses T-09 rejouées en multi-connexions.

---

## Phase 3 — Radar et LIVE (Lot 3)

Prérequis : décisions de la section C.

### 3a — Radar, sessions, admissions
| ID | Story | Acceptation |
|---|---|---|
| S-3.1 | Radar 30/60/120 (défaut 120), indicateur persistant dans le header avec temps restant serveur, arrêt manuel, expiration [RAD-01/02] | e2e (reload ≠ activation) |
| S-3.2 | `pg_cron` `job_expire_all` + filtrage `expires_at` dans toutes les lectures | **T-06**, **T-16** |
| S-3.3 | Lancer une session (formation), membres du club qui rejoignent directement (D-26), prolonger, fermer avec confirmation et nombre de participants [LIV-01/09/10] | **T-07**, **T-08** |
| S-3.4 | Demandes spontanées : file discrète avec compteur, accepter/refuser [LIV-02/07] | **T-04** |
| S-3.5 | Invitations LIVE : envoyer, annuler, accepter = banc ; 1 invitation active par joueur et par session [LIV-02/07, APP-04] | **T-03** |
| S-3.6 | Quitter ou retirer un participant [LIV-08] | e2e |
| S-3.7 | Realtime Broadcast `live:{id}`, `user:{uid}` ; refetch à la reconnexion | e2e deux navigateurs |
| S-3.8 | Accueil contextuel avec priorités strictes et anti-doublon d'urgence [ACC-01..04] | Vitest (rules) + e2e |

### 3b — Terrain
| ID | Story | Acceptation |
|---|---|---|
| S-3.9 | Terrain par formation, banc sous les titulaires, halo LIVE modéré [LIV-03, UX-04] | revue visuelle mobile |
| S-3.10 | Banc → poste libre, swap confirmé, retour au banc, changement de formation ; `expected_revision` [LIV-04] | **T-05** (course réelle) |
| S-3.11 | AUTOFILL gratuit (participants actifs uniquement, priorité au poste principal puis aux secondaires) [LIV-05] | Vitest exhaustif sur `rules.ts` |
| S-3.12 | Snapshot de feuille finalisée à la fermeture (D-27) | pgTAP |

**Gate G4** : TTL, admissions, terrain, Realtime et courses vérifiés ; démo à deux téléphones.

---

## Phase 4 — Explorer et EA (Lot 4)

| ID | Story | Acceptation |
|---|---|---|
| S-4.1 | Explorer > Jouer : sessions ouvertes réelles, capacité et expiration vérifiées, demande d'accès [EXP-03] | e2e |
| S-4.2 | Explorer > Clubs : cartes compactes, filtres fréquents + panneau + chips, états fermé / déjà membre / déjà candidat / 2 affiliations [EXP-02/04] | e2e |
| S-4.3 | Explorer > Joueurs (managers autorisés, D-11) : LIVE hors session uniquement, invitation LIVE ou club [EXP-05, RAD-03] | **T-16**, **T-11** |
| S-4.4 | Filtres et scroll indépendants par sous-intention, conservés au retour (URL state) [EXP-01] | e2e |
| S-4.5 | Profil tiers [PRO-01] ; `EAProvider` avec implémentation `Unavailable` → « Données indisponibles » [PRO-02] | **T-12** |
| S-4.6 | *(conditionnel à D-04)* Provider EA réel, liaison d'identité, snapshots, job de synchronisation | revue juridique préalable |
| S-4.7 | Alertes et recherches enregistrées opt-in, qui ne déclenchent jamais le Radar [RAD-04, EXP-03] | — (peut glisser après le lancement) |

**Gate G4b** : Explorer complet sans aucune donnée inventée.

---

## Phase 5 — Social et Safety (Lot 5)

| ID | Story | Acceptation |
|---|---|---|
| S-5.1 | Messagerie 1:1 contextuelle (en-tête, profils, candidatures, invitations, sessions) ; pagination, pending, dédup, erreurs [MSG-01/02] | e2e + pgTAP |
| S-5.2 | Centre de notifications : priorités, lu, historique, expiration, CTA invalides désactivés ; préférences [NOT-01/02] | e2e |
| S-5.3 | Bloquer/débloquer (UI) ; effets dans découverte, invitations, messages, notifications [SAF-01] | **T-11** complet |
| S-5.4 | Signaler un joueur, un club, un message ou un avis [SAF-01] | pgTAP |
| S-5.5 | Admin modération : file de signalements, dossiers, sanctions, appels, audit [SAF-02] | **T-14**, rôles staff |
| S-5.6 | Avis vérifiés (D-31) : éligibilité par snapshot, agrégats ≥ 3 [PRO-03/04] | **T-13** |
| S-5.7 | Suppression de compte avec réauthentification récente, anonymisation (D-06) [AUTH-04, SAF-03] | **T-18** |
| S-5.8 | Pages légales finales (D-19 requis) [SAF-03/05] | relecture Selim |

**Gate G5** : RLS/GRANT audités sur toutes les tables, blocages, modération, suppression de compte.

**Jalon M1 — Beta privée** possible ici (sans Pro), sur le projet prod, avec CGU et confidentialité en ligne.

---

## Phase 6 — Pro (Lot 6)

| ID | Story | Acceptation |
|---|---|---|
| S-6.1 | `pro_entitlements`, `billing_events`, webhook signé et idempotent (mode test) | pgTAP + rejeu de webhook |
| S-6.2 | Checkout et portail client (D-07), page abonnement | e2e en mode test |
| S-6.3 | COMBLER : candidats externes + invitations individuelles, contrôle `has_pro` serveur [LIV-06] | **T-15** |
| S-6.4 | Admin des entitlements (lecture, correction auditée) | — |

**Gate G6** : aucun paiement réel sans accord explicite de Selim.

---

## Phase 7 — Release web (Lot 7)

| ID | Tâche | Acceptation |
|---|---|---|
| S-7.1 | Projet Supabase prod (Pro), Vercel Pro, domaine, SMTP prod, OAuth prod | checklist 07 cochée |
| S-7.2 | E2E complets iPhone Safari, Android Chrome, desktop | rapport Playwright |
| S-7.3 | Accessibilité et performance mesurées (D-10) | **T-17**, rapport Lighthouse |
| S-7.4 | Audit RLS final, `get_advisors` sécurité et performance Supabase, scan des dépendances | 0 critique/haute non traitée |
| S-7.5 | Observabilité, alertes et runbook incident | — |
| S-7.6 | Rapport go/no-go production | **décision Selim** |

---

## Dépendances clés

```text
P0 ─► P1 ─► P2 ─► P3a ─► P3b ─► P5 ─► P6 ─► P7
                    └──► P4 ─────┘
blocks + notifications socle : P2 (requis par P3/P4)
EA réel : hors chemin critique (Unavailable par défaut)
```
