# CPC V2 — 04 · Schéma Supabase V2 proposé, permissions et RLS

**Statut : conception, pas du SQL approuvé.** Aucune DDL n'est produite à ce stade (consigne « aucun code »). Les tables sont décrites en colonnes, contraintes et prédicats ; le SQL sera écrit en Phase 1+ après GO.
Le schéma part de zéro, sans aucune référence au schéma V1. Les tables marquées *(Ph. N)* ne sont créées qu'à la phase indiquée.

**Schémas Postgres**
- `public` : tables lisibles sous RLS (exposé PostgREST).
- `api` : RPC commandes et lectures complexes (exposé, `EXECUTE` limité à `authenticated`).
- `private` : helpers, audit, staff, idempotence, billing, jobs (**non exposé**).

---

## 1. Types énumérés

| Enum | Valeurs |
|---|---|
| `platform` | `ps5`, `xbox_series`, `pc` (D-15) |
| `position_code` | 15 valeurs (D-14) : `GK` · `RB, LB, CB, RWB, LWB` · `CDM, CM, CAM, RM, LM` · `RW, LW, CF, ST` |
| `position_group` | `GK, DEF, MID, ATT` (dérivé du code par une fonction immuable) |
| `membership_slot` | `primary`, `secondary` |
| `club_role` | `owner`, `manager`, `member` |
| `membership_end_reason` | `left`, `removed`, `replaced`, `club_dissolved`, `account_deleted` |
| `club_level` | `casual`, `intermediate`, `competitive`, `elite` (niveau **déclaré**) |
| `application_status` | `pending`, `awaiting_player_confirmation`, `accepted`, `rejected`, `withdrawn`, `expired` |
| `invitation_status` | `pending`, `accepted`, `declined`, `cancelled`, `expired` |
| `transfer_status` | `pending`, `accepted`, `declined`, `cancelled`, `expired` |
| `live_status` | `active`, `closed`, `expired` |
| `live_request_status` | `pending`, `accepted`, `rejected`, `cancelled`, `expired`, `invalidated` |
| `live_invitation_status` | `pending`, `accepted`, `declined`, `cancelled`, `expired`, `invalidated` |
| `participant_status` | `active`, `left`, `removed`, `session_ended` |
| `admission_source` | `creator`, `club_member`, `request`, `invitation` |
| `notification_priority` | `urgent_live`, `decision`, `info` |
| `report_target` | `profile`, `club`, `message`, `review` |
| `sanction_kind` | `warning`, `mute_messaging`, `suspend`, `ban` |

---

## 2. Tables par domaine

### 2.1 Identité (Ph. 1)

**`public.profiles`** : profil CPC, visible des utilisateurs authentifiés.
| Colonne | Type | Contraintes |
|---|---|---|
| `id` | uuid | PK, FK `auth.users(id)` ON DELETE RESTRICT (suppression = anonymisation, D-06) |
| `handle` | citext | unique, 3–20 caractères, `[a-z0-9_.-]` |
| `avatar_path` | text | nullable |
| `platform` | platform | NOT NULL après onboarding |
| `main_position` | position_code | NOT NULL après onboarding |
| `bio` | text | ≤ 280 |
| `languages` | text[] | codes ISO 639-1, ≤ 3 |
| `ea_gamertag` | text | déclaratif, jamais présenté comme vérifié (D-20) |
| `onboarded_at` | timestamptz | NULL = onboarding incomplet |
| `deleted_at` | timestamptz | tombstone |
| `created_at` / `updated_at` | timestamptz | défaut `now()` |

**`public.profile_positions`** : `(profile_id, position)` PK ; au plus 3 postes secondaires (contrôlé par la commande), sans doublon du poste principal.

**`public.account_settings`** (privé, propriétaire seul) : `profile_id` PK · `locale` · `age_confirmed_at` · `age_threshold` (seuil déclaré, ≥ 18, D-12) · `terms_version` · `privacy_version` · `marketing_opt_in`. `active_club_id` sera ajouté avec les clubs (Phase 2 du backlog).

> **Implémenté en S-1.3** (migrations `20261026001000` → `20261026001300`) : D-38, schémas `api`/`private`, privilèges par défaut fermés, enums `platform` / `position_code` / `position_group` + `position_group_of()`, `profiles`, `profile_positions`, `account_settings`, `private.staff_members`, `private.idempotency_keys`, `private.rate_limits`. `notification_preferences` reportée à la Phase 5 (inutile au lot).

**`public.notification_preferences`** : `(profile_id, type)` PK · `in_app` · `email` · `push`.

### 2.2 Clubs et affiliations (Ph. 2)

**`public.clubs`**
| Colonne | Contraintes |
|---|---|
| `id` uuid PK, `name` (3–32), `slug` citext unique, `crest_path`, `description` (≤ 500) | |
| `platform`, `languages` text[], `level` club_level | déclaratifs |
| `recruiting_open` bool, `recruiting_positions` position_code[] | |
| `status` (`active`/`dissolved`), `dissolved_at` | |
| `created_by` FK profiles, `created_at`, `updated_at` | |

**`public.club_memberships`** : une ligne par adhésion, historique conservé.
| Colonne | Contraintes |
|---|---|
| `id` uuid PK, `club_id` FK, `profile_id` FK | |
| `slot` membership_slot, `role` club_role | |
| `is_active` bool, `joined_at`, `ended_at`, `end_reason` | `end_reason` NOT NULL si inactif |

Invariants :
- **Max 1 PRIMARY + 1 SECONDARY** : contrainte d'exclusion `(profile_id =, slot =) WHERE is_active`, **DEFERRABLE INITIALLY DEFERRED**, pour permettre l'inversion PRIMARY↔SECONDARY dans une seule transaction (un index unique partiel n'est pas différable).
- **1 adhésion active par couple club/joueur** : unique partiel `(club_id, profile_id) WHERE is_active`.
- **1 OWNER actif par club** : exclusion `(club_id =) WHERE is_active AND role = 'owner'`, différable (transfert atomique). « Au moins 1 OWNER » est garanti par les commandes et vérifié par un test pgTAP d'invariant.

**`public.club_applications`** : `id` · `club_id` · `profile_id` · `message` (≤ 500) · `status` · `decided_by` · `decided_at` · `expires_at` · `created_at`.
Unique partiel `(club_id, profile_id) WHERE status IN ('pending','awaiting_player_confirmation')` (APP-01).

**`public.club_invitations`** : `id` · `club_id` · `profile_id` (invité) · `invited_by` · `message` · `status` · `expires_at` · `decided_at` · `created_at`.
Unique partiel `(club_id, profile_id) WHERE status = 'pending'` (INV-03).

**`public.ownership_transfers`** : `id` · `club_id` · `from_profile_id` · `to_profile_id` · `status` · `expires_at` · `decided_at`.
Unique partiel `(club_id) WHERE status = 'pending'`.

**`private.membership_events`** (append-only) : `id` · `club_id` · `profile_id` · `actor_id` · `type` (`joined`, `left`, `removed`, `slot_swapped`, `role_changed`, `replaced`, `ownership_transferred`, `club_dissolved`) · `payload` jsonb · `created_at`.

### 2.3 Radar (Ph. 3)

**`public.radar_sessions`** : `id` · `profile_id` · `duration_min` CHECK ∈ {30, 60, 120} · `started_at` · `expires_at` · `ended_at` · `end_reason` (`manual`, `expired`, `account`).
Unique partiel `(profile_id) WHERE ended_at IS NULL`. Index `(expires_at) WHERE ended_at IS NULL`.
Un Radar est « actif » si `ended_at IS NULL AND expires_at > now()`. Il est « disponible » s'il est actif **et** que le joueur n'a aucune participation LIVE active (RAD-03, T-16).

### 2.4 LIVE (Ph. 3)

**`public.live_sessions`**
| Colonne | Contraintes |
|---|---|
| `id`, `club_id` FK, `created_by` | |
| `status` live_status, `formation` (code de la liste fermée, D-25) | |
| `started_at`, `expires_at`, `extended_total_min`, `closed_at`, `closed_by` | durée totale ≤ 360 min (D-03) |
| `lineup_revision` int | verrou optimiste du terrain |
| `finalized_at` | rempli à la fermeture manuelle (D-27) |

Unique partiel `(club_id) WHERE status = 'active'` (D-24).

**`public.live_participants`** : `id` · `session_id` · `profile_id` · `admitted_via` admission_source · `status` · `joined_at` · `left_at`.
- Unique partiel `(session_id, profile_id) WHERE status = 'active'`.
- Unique partiel `(profile_id) WHERE status = 'active'`, soit une seule participation active par joueur (D-02).

**`public.live_requests`** : `id` · `session_id` · `profile_id` · `status` · `expires_at` · `decided_by` · `decided_at`. Unique partiel `(session_id, profile_id) WHERE status = 'pending'`.

**`public.live_invitations`** : `id` · `session_id` · `profile_id` · `invited_by` · `source` (`manual`, `combler`) · `status` · `expires_at` · `decided_at`. Unique partiel `(session_id, profile_id) WHERE status = 'pending'` (LIV-07).

**`public.lineup_assignments`** : PK `(session_id, slot_code)` · `participant_id` FK live_participants · `assigned_by` · `assigned_at`.
- Unique `(session_id, participant_id)` : 1 poste maximum par participant.
- La commande vérifie que `slot_code` appartient à la formation et que le participant est actif. Un participant non affecté est au banc (LIV-03).

**`private.lineup_events`** (append-only) : `session_id` · `revision` · `type` (`assign`, `swap`, `unassign`, `autofill`, `formation_changed`) · `actor_id` · `payload`.

**`public.lineup_snapshots`** : `session_id` PK · `finalized_at` · `finalized_by` · `slots` jsonb `[{slot_code, profile_id}]` · `bench` jsonb. Base de l'éligibilité aux avis (PRO-04).

### 2.5 Communication et notifications (notifications Ph. 2, messages Ph. 5)

**`public.conversations`** : `id` · `kind` (`direct`) · `direct_key` unique (paire d'uuid triée) · `context_type` / `context_id` (optionnels) · `last_message_at`.
**`public.conversation_members`** : PK `(conversation_id, profile_id)` · `last_read_at` · `left_at`.
**`public.messages`** : `id` · `conversation_id` · `sender_id` · `client_id` uuid · `body` (1–2000) · `created_at` · `edited_at` · `deleted_at` · `moderation_state` (`visible`, `hidden`).
Unique `(sender_id, client_id)` pour la déduplication (MSG-02). Index `(conversation_id, created_at DESC)` pour la pagination.

**`public.notifications`** : `id` · `recipient_id` · `type` · `priority` · `payload` jsonb (IDs seulement) · `dedupe_key` · `created_at` · `read_at` · `expires_at`.
Unique `(recipient_id, dedupe_key)` (ACC-04, NOT-01). Écrites uniquement par les commandes et les jobs.

### 2.6 Avis (Ph. 5)

**`public.reviews`** : `id` · `session_id` FK lineup_snapshots · `reviewer_id` · `reviewee_id` · `team_spirit`, `communication`, `fair_play` smallint 1–5 · `comment` (privé) · `state` (`published`, `hidden`) · `created_at`.
Unique `(session_id, reviewer_id, reviewee_id)`. Pas d'auto-évaluation.
**`api.review_aggregates`** (RPC ou vue `security_invoker` sur une table d'agrégats) : moyennes par critère et nombre d'avis, exposés seulement si le nombre d'avis est ≥ 3 (D-31).

### 2.7 Trust & Safety (blocages Ph. 2, le reste Ph. 5)

**`public.user_blocks`** : PK `(blocker_id, blocked_id)` · `created_at` ; CHECK `blocker_id <> blocked_id`.
**`public.reports`** : `id` · `reporter_id` · `target_type` · `target_id` · `reason` · `details` (≤ 1000) · `status` (`open`, `in_review`, `actioned`, `dismissed`) · `created_at`.
**`private.moderation_cases`** · **`private.moderation_actions`** (append-only) · **`public.sanctions`** (`profile_id`, `kind`, `starts_at`, `ends_at`, `reason_public`, `case_id`) · **`public.appeals`** (`sanction_id`, `profile_id`, `body`, `status`).
**`private.staff_members`** : `profile_id` PK · `role` (`moderator`, `admin`) · `granted_by` · `granted_at` · `revoked_at`.
**`private.audit_events`** (append-only) : `actor_id` · `actor_kind` (`user`, `staff`, `system`) · `action` · `entity_type` · `entity_id` · `payload` · `created_at`.

### 2.8 EA (Ph. 4, création conditionnée à D-04)

**`public.ea_links`** : `profile_id` PK · `platform` · `ea_identifier` · `status` (`unverified`, `verified`, `failed`) · `method` · `verified_at`.
**`public.ea_stat_snapshots`** : `id` · `profile_id` · `source` · `ea_title` · `platform` · `period` · `retrieved_at` · `status` (`ok`, `unavailable`, `error`) · `data` jsonb validé.
**`private.ea_sync_jobs`** : file de jobs, avec tentatives et erreurs.

### 2.9 Pro (Ph. 6)

**`public.pro_entitlements`** : `profile_id` PK (D-32) · `status` (`active`, `past_due`, `canceled`) · `current_period_end` · `provider` · `provider_customer_id` · `updated_at`.
**`private.billing_events`** : `provider_event_id` unique · `type` · `payload` · `received_at` · `processed_at` (idempotence, anti-rejeu).

### 2.10 Technique (Ph. 1)

**`private.idempotency_keys`** : PK `(profile_id, request_id)` · `command` · `response` jsonb · `created_at` (purge à 7 j).
**`private.rate_limits`** : `(profile_id, bucket, window_start)` · `count`.

### 2.11 Storage

| Bucket | Lecture | Écriture |
|---|---|---|
| `avatars` (**privé**) | URL signées 10 min, générées côté serveur pour un authentifié autorisé, non bloqué (ADR-0015) | propriétaire, `avatars/{uid}/{uuid}.{ext}`, ≤ 2 Mo, png/jpeg/webp (pas de SVG) |
| `crests` (**privé**) | URL signées 10 min, club actif | OWNER/managers du club, `crests/{club_id}/{uuid}.{ext}` |

---

## 3. Helpers d'autorisation (`private`, SECURITY DEFINER, STABLE, `search_path = ''`)

| Fonction | Rôle |
|---|---|
| `uid()` | `auth.uid()`, plus refus si le profil est supprimé |
| `is_onboarded(uid)` | onboarding complet |
| `is_club_member(club, uid)` | adhésion active |
| `is_club_manager(club, uid)` | adhésion active avec rôle ∈ {owner, manager} |
| `is_club_owner(club, uid)` | adhésion active avec rôle = owner |
| `is_blocked_between(a, b)` | blocage dans un sens ou dans l'autre |
| `has_active_sanction(uid, kind)` | sanction en cours |
| `is_staff(uid, min_role)` | lecture de `staff_members` |
| `is_live_participant(session, uid)` | participation active |
| `is_radar_available(uid)` | Radar actif et hors session |
| `is_authorized_scout(uid)` | D-11 : manager d'au moins un club et sans sanction |
| `has_pro(uid)` | entitlement actif et `current_period_end > now()` |

---

## 4. Matrice RLS par table et par opération

Légende : **∅** = aucun privilège (`REVOKE`) · **cmd** = écriture uniquement via commande `api.*` · « soi » = `profile_id = uid()` · B = non bloqué avec le lecteur.
`anon` n'a **aucun** privilège sur aucune table. Les admins passent par des RPC `api.staff_*`, jamais par des policies larges.

| Table | SELECT (authenticated) | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | non supprimés et B ; soi toujours | cmd (onboarding) | soi, colonnes `avatar_path, bio, languages, ea_gamertag` seulement | ∅ |
| `profile_positions` | comme `profiles` | cmd | cmd | cmd |
| `account_settings` | soi | cmd (création à l'onboarding) | soi, colonnes `active_club_id, locale, marketing_opt_in` | ∅ |
| `notification_preferences` | soi | soi | soi | ∅ |
| `clubs` | `status = 'active'` (ou membre/historique) | cmd | cmd (managers via `update_club`) | ∅ |
| `club_memberships` | actives : tout authentifié (effectif, CLB-05) ; inactives : soi + managers du club | cmd | cmd | ∅ |
| `club_applications` | soi (candidat) ; managers du club ciblé | cmd | cmd | ∅ |
| `club_invitations` | soi (invité) ; managers du club | cmd | cmd | ∅ |
| `ownership_transfers` | from/to ; managers du club | cmd | cmd | ∅ |
| `radar_sessions` | **soi uniquement** (I-1) ; découverte via `api.search_available_players` | cmd | cmd | ∅ |
| `live_sessions` | membres du club ; participants ; sessions actives ouvertes à la découverte (EXP-03) sauf si un manager du club bloque le lecteur | cmd | cmd | ∅ |
| `live_participants` | participants de la session ; managers du club | cmd | cmd | ∅ |
| `live_requests` | soi ; managers du club | cmd | cmd | ∅ |
| `live_invitations` | soi (invité) ; managers du club | cmd | cmd | ∅ |
| `lineup_assignments` | participants ; managers du club | cmd | cmd | cmd |
| `lineup_snapshots` | joueurs présents dans le snapshot ; managers du club | cmd | ∅ | ∅ |
| `conversations` | membres (non sortis) | cmd | ∅ | ∅ |
| `conversation_members` | membres de la conversation | cmd | soi, `last_read_at` | ∅ |
| `messages` | membres, `moderation_state = 'visible'`, hors blocage | cmd (`send_message`) | cmd (édition) | cmd (soft delete) |
| `notifications` | soi | ∅ (système) | soi, `read_at` | ∅ |
| `reviews` | reviewer : ses avis écrits ; jamais le commentaire d'un autre | cmd | ∅ | ∅ |
| `user_blocks` | soi en tant que bloqueur (jamais « qui m'a bloqué ») | cmd | ∅ | cmd |
| `reports` | soi (reporter) : statut seulement | cmd | ∅ | ∅ |
| `sanctions` | soi | ∅ (staff via cmd) | ∅ | ∅ |
| `appeals` | soi | cmd | ∅ | ∅ |
| `ea_links` / `ea_stat_snapshots` | comme `profiles` | système | système | ∅ |
| `pro_entitlements` | soi | ∅ (webhook) | ∅ | ∅ |
| `private.*` | non exposé, aucun GRANT | — | — | — |

**Realtime** : policies sur `realtime.messages`. `user:{uid}` est réservé à uid ; `live:{id}` à `is_live_participant OR is_club_manager` ; `club:{id}` à `is_club_manager`. L'option « accès public » de Realtime est désactivée.

---

## 5. Catalogue des commandes (`api`, SECURITY DEFINER)

Chaque commande : `p_request_id` (idempotence) → `uid()` non nul et non sanctionné pour l'action → verrous → contrôle de rôle → invariants → écritures, audit, notification, broadcast → `{data, server_now}`.

| Domaine | Commande | Contrôles clés | Erreurs typiques | Tests |
|---|---|---|---|---|
| Profil | `complete_onboarding` | handle unique, postes valides, âge confirmé | VALIDATION, CONFLICT | — |
| | `set_positions` | ≤ 3 secondaires, différents du principal | VALIDATION | — |
| | `request_account_deletion` | réauthentification récente (vérifiée côté app), OWNER avec membres → transfert d'abord | OWNER_MUST_TRANSFER | T-18 |
| Club | `create_club` | slot libre (D-21), rate limit | LIMIT_REACHED | — |
| | `update_club` | manager du club | FORBIDDEN | T-10 |
| | `apply_to_club` | non membre, pas de candidature active, recrutement ouvert, B | CONFLICT, BLOCKED | T-01 |
| | `withdraw_application` | candidat, statut actif | ALREADY_HANDLED | — |
| | `decide_application(accept/reject)` | manager **de ce club** ; si le candidat a 2 slots → `awaiting_player_confirmation` | FORBIDDEN, ALREADY_HANDLED | T-01, T-10 |
| | `confirm_membership_replacement` | le candidat confirme le remplacement du SECONDARY ; règle R-1 | OWNER_MUST_TRANSFER, EXPIRED | T-02 |
| | `invite_to_club` | manager du club, cible non membre, pas de doublon, B | CONFLICT, BLOCKED | — |
| | `cancel_club_invitation` | manager, statut `pending` | ALREADY_HANDLED | — |
| | `respond_club_invitation(accept, replace_membership_id?)` | invité ; si 2 slots, `replace_membership_id` obligatoire, sinon CONSENT_REQUIRED | CONSENT_REQUIRED, EXPIRED | T-02 |
| | `swap_primary_secondary` | 2 adhésions actives ; contrainte différée | — | CLB-01 |
| | `leave_club` | OWNER avec membres → refus | OWNER_MUST_TRANSFER | CLB-03/08 |
| | `remove_member` | manager du club ; cible ≠ OWNER ; un manager ne peut pas retirer un manager (OWNER seul) | FORBIDDEN | T-10 |
| | `set_member_role(manager/member)` | OWNER seul | FORBIDDEN | T-10 |
| | `propose_ownership_transfer` / `cancel_ownership_transfer` / `respond_ownership_transfer` | OWNER → membre actif ; acceptation atomique (contrainte différée) | ALREADY_HANDLED, EXPIRED | T-09 |
| | `dissolve_club` | OWNER seul membre (D-06) | FORBIDDEN | — |
| Radar | `start_radar(duration)` / `stop_radar` | volontaire uniquement, rate limit | RATE_LIMITED | RAD-01 |
| LIVE | `start_live_session(club, duration, formation)` | manager, aucune session active du club, créateur hors autre session | CONFLICT | — |
| | `extend_live_session(expected_expires_at, minutes)` | manager, session active non échue, plafond 6 h | EXPIRED, CONFLICT, LIMIT_REACHED | T-07 |
| | `close_live_session(expected_participant_count)` | manager ; clôt les participants, invalide demandes et invitations, crée le snapshot | CONFLICT | T-08 |
| | `join_club_live` | membre du club (D-26), hors autre session | CONFLICT | — |
| | `request_live_access` / `cancel_live_request` | externe, session active, B, hors autre session | EXPIRED, BLOCKED | T-04 |
| | `decide_live_request` | manager ; revérifie session active et capacité | EXPIRED, LIMIT_REACHED | T-04, T-06 |
| | `invite_to_live(profile, source)` | manager ; règle D-28 ; `source = combler` exige `has_pro` | PRO_REQUIRED, BLOCKED | T-03, T-15 |
| | `cancel_live_invitation` | manager, statut `pending` | ALREADY_HANDLED | — |
| | `respond_live_invitation` | invité ; verrouille la session ; si elle est échue → EXPIRED, aucune participation créée | EXPIRED | T-03, T-06 |
| | `leave_live_session` / `remove_live_participant` | libère le poste, revision + 1 | — | LIV-08 |
| | `lineup_assign` / `lineup_swap` / `lineup_unassign` | manager, `expected_revision` | CONFLICT | T-05 |
| | `lineup_set_formation` | manager, renvoie au banc les postes disparus | CONFLICT | — |
| | `lineup_autofill(expected_revision)` | manager ; participants actifs uniquement, gratuit (LIV-05) | CONFLICT | LIV-05 |
| | `combler_candidates(session)` *(lecture)* | manager + `has_pro` ; joueurs disponibles, B | PRO_REQUIRED | T-15 |
| Découverte | `search_available_players(filters)` *(lecture)* | `is_authorized_scout` ; Radar disponible ; B | FORBIDDEN | T-11, T-16 |
| | `search_open_sessions(filters)` / `search_clubs(filters)` *(lecture)* | B, sessions non échues | — | EXP-03/04 |
| Social | `open_direct_conversation(other)` | B, pas de sanction `mute_messaging` | BLOCKED, SANCTIONED | T-11 |
| | `send_message(conversation, client_id, body)` | membre, B, rate limit | BLOCKED, RATE_LIMITED | MSG-02 |
| | `block_user` / `unblock_user` | ≠ soi ; annule invitations et demandes en attente entre les deux | — | T-11 |
| | `submit_report` | rate limit | RATE_LIMITED | SAF-01 |
| | `submit_review` | co-présents dans le snapshot, ≤ 7 j, unique | FORBIDDEN | T-13 |
| | `submit_appeal` | sanction propre active | — | SAF-02 |
| Staff | `staff_list_reports`, `staff_open_case`, `staff_apply_sanction`, `staff_revoke_sanction`, `staff_decide_appeal`, `staff_hide_content` | `is_staff`, audit obligatoire | FORBIDDEN | T-14 |
| Système | `private.job_expire_all` (pg_cron) · `private.apply_billing_event` (webhook, service role) | non exposés | — | T-06 |

---

## 6. Plan de tests base de données (pgTAP)

- **Personas** seedés (synthétiques) : anonyme, A, B, manager club A, manager club B, OWNER club A, admin, bloqué, sanctionné.
- **Par table** : SELECT/INSERT/UPDATE/DELETE testés pour chaque persona ; aucune écriture directe possible sur les tables en « cmd ».
- **Par commande** : chemin nominal, chaque code d'erreur, IDOR (UUID d'un autre club ou d'un autre joueur), idempotence (même `request_id` deux fois).
- **Invariants globaux** : 1 OWNER par club actif, ≤ 2 adhésions actives, 1 participation LIVE active, 1 poste par participant.
- **Courses** (script multi-connexions hors pgTAP) : T-05 (double déplacement), T-06 (acceptation à l'expiration), T-07 (prolongation à l'échéance), T-09 (transfert concurrent).
