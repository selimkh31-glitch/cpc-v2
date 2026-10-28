# CPC V2 — 26 · Contrat B0 : Explorer Clubs (P2-B)

- **Statut :** 🟡 CONTRAT soumis à validation (PR B0). C'est la référence unique des sous-lots B1 à B7 (`docs/25` §8). **Aucune migration** dans B0.
- **Date :** 28/10/2026 · **Décisions :** D-21, D-23, D-43 (report), D-45 à D-48 (`docs/02` §3 bis).
- **Code du contrat :**
  - `src/features/clubs/contract.ts` : référentiels, normalisation D-48, entrées et sorties des commandes, erreurs ;
  - `src/features/explore/contract.ts` : intentions, filtres d'URL, curseur, arguments de recherche ;
  - `src/lib/errors/rpc.ts` : `NOT_FOUND` et `LIMIT_REACHED` ajoutés, issus de la liste canonique de `docs/03` §4 ;
  - `tests/unit/clubs-contract.test.ts`, `tests/unit/explore-filters.test.ts` ;
  - `tests/fixtures/normalize-search.json` : vecteurs partagés avec le pgTAP de B2.

---

## 1. Personas de test (pgTAP et e2e, données synthétiques créées par les tests uniquement)

| Persona | Définition |
|---|---|
| `anon` | rôle `anon`, sans JWT |
| `X` | authentifié, **non onboardé** |
| `A` | onboardé, sans club |
| `B` | onboardé, sans club, sans relation avec A |
| `O` | OWNER du club C1 (PRIMARY) |
| `M` | manager de C1 (posé directement par la fixture, la commande de rôle arrive en P2-E) |
| `K` | membre simple de C1 |
| `Z` | a bloqué O (blocage dans un sens) |
| `Y` | bloqué par O (blocage dans l'autre sens) |
| `F` | 2 affiliations actives (PRIMARY + SECONDARY) |
| `D` | ancien membre d'un club dissous C9 |

---

## 2. Signatures SQL (à implémenter en B1 à B3)

Convention existante (`complete_onboarding`) :
- erreurs : `raise exception using message = '<CODE>', detail = '<texte FR>', errcode = 'P0001'` ;
- fonctions SECURITY DEFINER, `set search_path = ''`, objets qualifiés ;
- `revoke execute … from public, anon` ; `grant execute … to authenticated`.

Retour : `jsonb` de la forme `{ "data": {…}, "server_now": "<timestamptz>" }`.

### 2.1 B1 — sécurité et blocages
```sql
-- private (EXECUTE refusé à anon ET authenticated, invariant P4 existant)
private.uid() returns uuid                                  -- auth.uid() ; NULL si le profil est supprimé
private.is_onboarded(p_uid uuid) returns boolean            -- profil existant, non supprimé
private.is_blocked_between(p_a uuid, p_b uuid) returns boolean
private.has_active_sanction(p_uid uuid) returns boolean     -- STUB : false (aucune table de sanctions avant la Phase 5)
private.normalize_search(p_text text) returns text IMMUTABLE -- miroir de normalizeSearch() (B2 si utilisé seulement par les clubs)

-- rls_policies (non exposé ; USAGE et EXECUTE à authenticated seulement ; SECURITY DEFINER minces)
rls_policies.can_see_profile(p_profile_id uuid) returns boolean   -- soi, ou non bloqué dans les deux sens

-- api
api.block_user(p_request_id uuid, p_target uuid) returns jsonb    -- data: { blocked: true }
api.unblock_user(p_request_id uuid, p_target uuid) returns jsonb  -- data: { blocked: false }
```

### 2.2 B2 — clubs
```sql
create extension if not exists btree_gist with schema extensions;  -- requis par les exclusions DEFERRABLE
create type public.club_level as enum ('casual','intermediate','competitive','elite');
create type public.club_role as enum ('owner','manager','member');
create type public.membership_slot as enum ('primary','secondary');
create type public.membership_end_reason as enum ('left','removed','replaced','club_dissolved','account_deleted');

private.normalize_search(p_text text) returns text IMMUTABLE
private.is_club_member(p_club uuid, p_uid uuid) returns boolean
private.is_club_manager(p_club uuid, p_uid uuid) returns boolean   -- owner ou manager, adhésion active
private.active_membership_count(p_uid uuid) returns int
rls_policies.can_see_club(p_club_id uuid) returns boolean
rls_policies.can_see_membership(p_membership_id uuid) returns boolean

api.create_club(p_request_id uuid, p_name text, p_description text, p_platform public.platform,
                p_languages text[], p_level public.club_level, p_recruiting_open boolean,
                p_recruiting_positions public.position_code[]) returns jsonb
  -- data: { club_id uuid, slug text, slot 'primary'|'secondary' }
api.update_club(p_request_id uuid, p_club_id uuid, p_expected_updated_at timestamptz,
                p_description text default null, p_languages text[] default null,
                p_level public.club_level default null, p_recruiting_open boolean default null,
                p_recruiting_positions public.position_code[] default null) returns jsonb
  -- data: { club_id uuid, updated_at timestamptz }
```
**Note `update_club` :** `NULL` signifie « inchangé ». Pour vider la description, l'application envoie une chaîne vide, que la commande convertit en `NULL`.

### 2.3 B3 — recherche
```sql
api.search_clubs(p_q text, p_platform public.platform, p_recruiting_only boolean, p_position public.position_code,
                 p_languages text[], p_level public.club_level, p_cursor_recruiting boolean,
                 p_cursor_name text, p_cursor_id uuid, p_limit int default 20) returns jsonb
  -- SECURITY INVOKER : lit sous RLS (clubs visibles pour l'appelant uniquement)
  -- data: { items: ClubSummary[] (≤ 20), next_cursor text|null }
  -- tri total : recruiting_open desc, search_name asc, id asc
  -- page suivante : (recruiting_open, search_name, id) strictement après (p_cursor_recruiting, p_cursor_name, p_cursor_id)
```
Le curseur (`encodeCursor`) porte les trois clés du tri : `r` (groupe recrute), `n` (`search_name`), `i` (`id`). Il est opaque pour l'utilisateur et validé à la lecture ; un curseur falsifié est ignoré (première page).

---

## 3. Règles par commande (R1 à R4, ADR-0004)

### `api.create_club`
Séquence :
1. Identité : `private.uid()` non nul, sinon `UNAUTHENTICATED`. Onboardé, sinon `UNAUTHENTICATED`. `has_active_sanction` vrai → `FORBIDDEN` (stub).
2. Idempotence : `(uid, p_request_id)` déjà présent → **même réponse**, sans écriture.
3. Validation, identique à `createClubInputSchema` : nom normalisé ; `slug = clubSlug(nom)` d'au moins 3 caractères ; langues `^[a-z]{2}$`, 1 à 3, distinctes ; postes distincts. Échec → `VALIDATION`.
4. Rate limit D-21 : `private.rate_limits` bucket `create_club`, fenêtre 24 h, 1 création. Dépassement → `RATE_LIMITED`. La fenêtre est en `detail`, pour que l'UI puisse indiquer l'heure de la prochaine création.
5. Verrou : `select … from public.club_memberships where profile_id = uid and is_active for update`.
6. Slot : aucun actif → `primary` ; seul `primary` actif → `secondary` ; 2 actifs → `LIMIT_REACHED`.
7. Écritures : `clubs` (`created_by = uid`, `status = 'active'`, `search_name`), `club_memberships` (role `owner`), `private.membership_events` (`joined`), `private.idempotency_keys`.
8. Unicité : la violation de `clubs_slug_key` est traduite en `CONFLICT` (« nom déjà pris »).

**Abus testés :** rejeu du même `request_id` ; deux `request_id` différents en parallèle avec un seul slot libre (**course C7** : une seule adhésion, l'autre reçoit `LIMIT_REACHED`) ; nom équivalent avec casse et accents différents (`CONFLICT`) ; paramètres falsifiés (rôle, propriétaire, statut : impossible, ce ne sont pas des paramètres).

### `api.update_club`
Séquence :
1. Identité et sanction.
2. Idempotence.
3. Club `p_club_id` verrouillé `for update` ; absent, dissous ou invisible pour l'appelant → `NOT_FOUND`.
4. `private.is_club_manager(club, uid)`, sinon `FORBIDDEN`.
5. `updated_at <> p_expected_updated_at` → `CONFLICT`.
6. Validation.
7. Écriture et nouvel `updated_at`.

**Abus testés :** IDOR (un manager de C1 modifie C2 → `FORBIDDEN`) ; membre simple → `FORBIDDEN` ; club dissous → `NOT_FOUND` ; rejeu ; verrou optimiste périmé.

### `api.search_clubs`
- Appelant onboardé, sinon `UNAUTHENTICATED`.
- `p_limit` borné à [1, 20].
- `p_q` est re-normalisé côté SQL (jamais fait confiance au client). Il est ignoré s'il fait moins de 2 caractères, et refusé (`VALIDATION`) au-delà de 32. `%` et `_` sont échappés.
- Visibilité : uniquement par RLS (`can_see_club`) ; aucun filtre de sécurité dupliqué à la main.

### `api.block_user` / `api.unblock_user`
- Soi-même, ou cible inexistante ou supprimée → `VALIDATION`.
- Idempotent : bloquer deux fois laisse une seule ligne et renvoie la même réponse.
- Rate limit `block_user` à 30 par heure.
- `docs/04` prévoit l'annulation des invitations et demandes en attente entre les deux comptes : **aucune table de ce type n'existe avant P2-D**. La règle sera ajoutée à `block_user` par la migration qui créera ces tables.

---

## 4. Matrice RLS (résultats attendus = tests pgTAP P2)

Légende : ✅ visible · ∅ invisible (0 ligne, sans erreur) · ⛔ refusé (privilège).

### `public.clubs`
| Lecteur | C1 actif (OWNER O) | C9 dissous | Après blocage Z→O ou O→Y |
|---|---|---|---|
| `anon` | ⛔ | ⛔ | ⛔ |
| `X` non onboardé | ∅ | ∅ | — |
| `A` | ✅ | ∅ | — |
| `O`, `M`, `K` | ✅ | ∅ | — |
| `D` (ancien membre de C9) | ✅ | ✅ (historique) | — |
| `Z` (a bloqué O) | ∅ | ∅ | ∅ (D-23) |
| `Y` (bloqué par O) | ∅ | ∅ | ∅ (D-23) |

Écritures : `INSERT`, `UPDATE` et `DELETE` → ⛔ pour `anon` et `authenticated`. Seules les commandes écrivent.

### `public.club_memberships`
| Lecteur | Adhésions actives de C1 | Adhésion inactive de K (après départ, P2-C, compléments) | Ligne d'un membre bloqué |
|---|---|---|---|
| `anon` | ⛔ | ⛔ | ⛔ |
| `A` | ✅ | ∅ | ∅ |
| `K` | ✅ | ✅ (la sienne) | ∅ |
| `O`, `M` | ✅ | ✅ (manager du club) | ∅ |

### `public.user_blocks`
| Lecteur | Ligne Z→O |
|---|---|
| `Z` | ✅ |
| `O` | ∅ : on ne voit pas qui nous a bloqué |
| autres | ∅ |

### `public.profiles` (modifiée en B1)
| Lecteur | Profil de O |
|---|---|
| `O` | ✅ toujours (soi) |
| `A` | ✅ |
| `Z`, `Y` | ∅ |
| `anon` | ⛔ (inchangé) |

**Effet en cascade :** `profile_positions` (sous-requête sur `profiles`) et les avatars (`private.avatar_is_visible`, modifiée) suivent le même blocage.

### Invariants globaux à conserver
P2 (RLS active partout), P4 (aucune fonction `api` ou `private` exécutable par anon ; `private` non exécutable par authenticated), P5 (`search_path` vide), D-38 (`rls_auto_enable`, `ensure_rls`), A-2 (privilèges par défaut fermés).

**Ajout B1 :** le test global étend P4 au schéma `rls_policies`. Aucune fonction n'y est exécutable par `anon`, et aucune table n'y existe.

---

## 5. Concurrence et idempotence (prévues dès le contrat)
| Risque | Parade | Test |
|---|---|---|
| Double envoi du formulaire | `request_id` (UUID, côté client, A-3) + `private.idempotency_keys` | pgTAP rejeu + e2e double clic |
| Deux créations simultanées, un seul slot | verrou `for update` des adhésions actives + exclusion DEFERRABLE `(profile_id, slot) where is_active` | **C7** (`tests/race/`) |
| Deux OWNER sur un club | exclusion `(club_id) where is_active and role = 'owner'` | pgTAP invariant |
| Nom identique à une casse ou un accent près | `slug` citext unique + `clubSlug()` identique côté TS et SQL | pgTAP `CONFLICT` + vecteurs |
| Modification concurrente des réglages | `p_expected_updated_at` → `CONFLICT` | pgTAP |
| Pagination instable | curseur `(recruiting_open, search_name, id)`, tri total | pgTAP |
| `lower()` dépendant de la collation | `normalize_search` appelle `lower(p_text collate "C")`, plus les tables explicites de ligatures et d'accents (y compris majuscules) | vecteurs avec majuscules accentuées (`ÀÉÎÕÜ`) |

> **Attention B2 :** avec la collation `C`, `lower()` ne convertit que l'ASCII. Pour garder la parité avec `toLowerCase()`, la table `translate()` du SQL doit **inclure les majuscules accentuées**, ou appliquer `lower()` avec une collation ICU explicite. Les vecteurs du fichier partagé le vérifient.

---

## 6. Routes (ADR-0005 mis à jour dans cette PR)
| Route | Accès | Lot |
|---|---|---|
| `/explore` | redirige vers le dernier segment, sinon `/explore/clubs` | B6 |
| `/explore/clubs` | onboardé ; filtres dans `searchParams` | B6 |
| `/explore/play` | onboardé ; état vide véridique (D-47) | B6 |
| `/explore/players` | **non créée** dans ce lot (404) | après Radar et D-11 |
| `/clubs/new` | onboardé | B5 |
| `/clubs/[clubId]` | `can_see_club`, sinon 404 (pas de différence entre interdit et inexistant) | B5 |
| `/clubs/[clubId]/manage/settings` | OWNER ou manager du club, sinon 404 | B5 |

---

## 7. Préparation des PR B1 à B7 (chacune exige un GO d'exécution)
| PR | Fichiers prévus | Preuves exigées dans la PR |
|---|---|---|
| **B1** sécurité et blocages | `supabase/migrations/<ts>_p2b_b1_security_blocks.sql`, `supabase/tests/database/070_blocks_rls.test.sql`, `000_global_invariants` (P4 étendu à `rls_policies`) | pgTAP vert en CI ; matrice §4 (`user_blocks`, `profiles`) ; brief `docs/27` |
| **B2** clubs | `<ts>_p2b_b2_clubs.sql`, `080_clubs_rls.test.sql`, `090_cmd_create_update_club.test.sql`, `tests/race/c7_create_club.ts` | 2 tables × personas ; invariants ; vecteurs de normalisation ; C7 |
| **B3** recherche | `<ts>_p2b_b3_search_clubs.sql`, `100_search_clubs.test.sql` | filtres, B, dissous exclus, curseur, plafond |
| **B4** primitives UI | `components/ui/{segmented-control,search-field,load-more}.tsx`, `components/patterns/{filter-bar,filter-sheet,club-card,club-hero,stepper}.tsx`, `ui/club-monogram.tsx`, galerie | axe, CSP, 44 px, Reduce Motion, Chromium et WebKit |
| **B5** UI clubs | `app/(app)/clubs/{new,[clubId],[clubId]/manage/settings}`, `features/clubs/{actions,queries,rules}.ts`, Profil > Mes clubs | e2e Supabase local ; Vitest `rules.ts` (groupement GK/DEF/MID/ATT) |
| **B6** UI Explorer | `app/(app)/explore/{page,clubs,play}`, `features/explore/{queries,components}` | e2e filtres, retour arrière, deux comptes, blocage |
| **B7** QA Preview | `docs/28_RAPPORT_P2B.md` | campagne iPhone, comptes `qa_*` créés pour la campagne puis supprimés |

**Ordre de fusion :** B1 → (application au staging après GO) → B2 → (staging) → B3 → (staging). B4 en parallèle. B5 après B2 et B4 ; B6 après B3 et B4 ; puis B7.
