# CPC V2 — 25 · Brief P2-B : Explorer, premier lot fonctionnel

- **Statut :** ✅ PÉRIMÈTRE VALIDÉ (Selim, 28/10/2026 19:43). Décisions D-21, D-23, D-43, D-45 à D-48 tranchées (§10). **GO limité au sous-lot B0** (contrats). B1 à B7 exigent chacun un GO d'exécution ; **aucune migration appliquée au staging sans GO spécifique**.
- **Date :** 28/10/2026 · **Base :** `main` `f91a337` (P2-A fusionné).
- **Demande (Selim, 28/10) :** faire d'Explorer le vrai point d'entrée pour découvrir joueurs, clubs et sessions LIVE, en respectant les fonctionnalités et dépendances du cahier UX, sans inventer de clubs, de sessions ni de statistiques.
- **Sources :** cahier UX §5 (EXP-01/02/03), `docs/22` master plan (PR #27), `docs/04` schéma, `docs/06` backlog (S-2.1, S-2.2, S-2.3, S-4.2, S-4.4), registre `docs/02` (D-11, D-21, D-23, D-43, D-01), ADR-0004, ADR-0005, ADR-0006, ADR-0008, ADR-0015, ADR-0017.

---

## 1. Constat : ce qu'Explorer peut montrer de réel, et quand

Cahier UX §5 : « Aucun résultat fictif ni profil affiché comme disponible sans preuve. » Master plan §3.2 : « Aucune fonctionnalité visible sans donnée réelle. »

| Intention | Donnée réelle requise | Existe aujourd'hui ? | Disponible au plus tôt |
|---|---|---|---|
| **Clubs** (EXP-02) | table `clubs` créée par de vrais joueurs (D-21) | ❌ aucune table club | **ce lot** |
| **Joueurs** (EXP-03, managers) | joueur « disponible » = Radar actif hors session (D-01, RAD-03) + droit manager (D-11) | ❌ ni Radar ni club | après Radar (P2-G) |
| **Jouer** (EXP-01) | sessions LIVE ouvertes | ❌ aucun LIVE | après LIVE (P2-H) |

**Conséquence :** le premier lot fonctionnel qui rend Explorer réel est **Explorer Clubs**. Il suppose que des clubs existent, donc la création de club et sa fiche (D-21). Joueurs et Jouer ne peuvent pas être réels avant le Radar et le LIVE : les afficher maintenant obligerait à inventer de la disponibilité.

### 1.1 Recadrage proposé du master plan
Le master plan (`docs/22` §4) place Explorer Clubs (P2-F) après les clubs (P2-C) et le recrutement (P2-D). Pour faire d'Explorer le premier lot visible, ce brief **regroupe en un lot vertical** :
- **P2-B (partiel)** : helpers d'autorisation et `user_blocks` (le blocage est appliqué côté serveur dès la recherche, sans UI) ;
- **P2-C (minimal)** : `clubs`, `club_memberships`, création, fiche, effectif, réglages de recrutement, « Mes clubs » ;
- **P2-F** : Explorer, structure par intention + Clubs.

**Reportés au lot suivant (P2-C2 « Recrutement », ex-P2-D) :** candidature, invitation club, profil d'autrui. Dans ce lot, la carte club n'affiche **pas** de bouton « Candidater » (aucun bouton sans backend). L'état « candidature active » arrive avec P2-C2.
**Reportés plus loin :** notifications in-app (socle P2-B, utile seulement avec les candidatures), blasons de club (D-43), inversion PRIMARY↔SECONDARY, quitter un club, gouvernance.

> **D-45 ✅ (Selim, 28/10) :** Explorer Clubs est le premier lot fonctionnel vertical (socle indispensable + création de club + Explorer Clubs). Le master plan `docs/22` (PR #27) est mis en cohérence avec ce nouvel ordre.

---

## 2. Périmètre du lot P2-B « Explorer Clubs »

| Inclus | Exclu (lot suivant ou plus tard) |
|---|---|
| Créer un club (D-21), en étapes courtes | Candidater, inviter, décider (P2-C2) |
| Fiche club : identité, recrutement, postes recherchés, effectif groupé GK/DEF/MID/ATT, rôles | Profil d'autrui `/players/[id]` (P2-C2) |
| Réglages de recrutement du club (OWNER et manager) | Rôles, retrait, transfert, dissolution (P2-E) |
| Profil > Mes clubs (lecture) | Inversion PRIMARY↔SECONDARY, quitter un club (P2-C3) |
| Explorer : contrôle segmenté **Jouer / Clubs** | Segment **Joueurs** (absent : Radar et D-11 requis) |
| Explorer Clubs : recherche, filtres, chips, fiche rapide en sheet, pagination | Alertes enregistrées (S-4.7) |
| Explorer Jouer : état vide véridique | Sessions LIVE (P2-H) |
| Blocage appliqué côté serveur (sans UI) | UI de blocage et de signalement (Phase 5) |
| Monogramme de club (initiales) | Blasons en bucket `crests` (D-43) |

---

## 3. Parcours

### 3.1 Joueur sans club
1. Onglet **Explorer**. Le dernier segment utilisé s'ouvre, Clubs par défaut.
2. Il voit la liste des clubs actifs. Filtres visibles : **Plateforme** (sa plateforme présélectionnée), **Recrute** (activé par défaut), **Poste** (son poste principal proposé, non imposé). Les autres filtres (langue, niveau) sont dans un panneau.
3. Un tap sur une carte ouvre la **fiche rapide** en sheet. Le bouton « Voir le club » mène à `/clubs/[id]`.
4. Sur la fiche, il voit l'identité, le niveau déclaré, les langues, le recrutement, les postes recherchés et l'effectif. **Aucune mention de candidature** (D-46) : ni bouton, ni texte, ni « bientôt ».
5. Retour arrière : la liste revient avec les mêmes filtres et la même position de défilement.

### 3.2 Joueur qui crée son club (futur manager)
1. Depuis Explorer Clubs (lien secondaire « Créer un club ») ou Profil > Mes clubs.
2. `/clubs/new` en 3 étapes :
   - **Identité** : nom 3–32, description ≤ 500 ;
   - **Jeu** : plateforme, langues ≤ 3, niveau déclaré ;
   - **Recrutement** : ouvert ou fermé, postes recherchés.
3. Envoi unique (verrou A-3, `request_id` idempotent). Le créateur devient **OWNER** : PRIMARY si son slot est libre, sinon SECONDARY. Refus s'il a déjà 2 affiliations, ou s'il a créé un club il y a moins de 24 h (D-21).
   **Il reste un joueur** : même compte, mêmes trois onglets, même profil. Les droits OWNER et manager sont **contextuels au club** et contrôlés côté serveur, à chaque commande et à chaque page de gestion ; ce n'est pas un « mode manager » global.
4. Il arrive sur la fiche de son club, avec un bouton **Gérer le recrutement**, visible seulement pour OWNER et manager (contrôle côté serveur).
5. `/clubs/[id]/manage/settings` : ouvrir ou fermer le recrutement, postes recherchés, description, langues, niveau.
6. Son club apparaît dans Explorer pour les autres utilisateurs **autorisés** (D-23) : authentifiés, onboardés, sans blocage avec l'OWNER. Jamais en anonyme.

### 3.3 Manager qui cherche des joueurs
**Hors lot.** Le segment Joueurs reste absent, ni grisé ni « bientôt ». Il apparaîtra quand le Radar (P2-G) fournira une disponibilité prouvée et que D-11 sera implémenté.

---

## 4. Modèle de données (conforme à `docs/04` §2.2, sous-ensemble)

### 4.1 Tables
**`public.clubs`**
- Colonnes :
  - `id` uuid PK ;
  - `name` text 3–32 ;
  - `slug` citext unique, dérivé du nom (`citext` déjà installé sur le staging) ;
  - `search_name` text, rempli par les commandes via `private.normalize_search(name)` (D-48) ;
  - `description` ≤ 500 ;
  - `platform` platform ;
  - `languages` text[] (≤ 3, ISO 639-1) ;
  - `level` club_level (`casual`, `intermediate`, `competitive`, `elite`, **déclaratif**) ;
  - `recruiting_open` bool, défaut false ;
  - `recruiting_positions` position_code[] (≤ 15, distincts) ;
  - `crest_path` NULL (pas d'usage avant D-43) ;
  - `status` (`active`, `dissolved`) ;
  - `dissolved_at` ;
  - `created_by` FK profiles ;
  - `created_at`, `updated_at`.
- Index :
  - `(status, platform, recruiting_open)` ;
  - GIN sur `recruiting_positions` et sur `languages` ;
  - btree sur `search_name` (pas de `pg_trgm`, D-48).

**`public.club_memberships`**
- Colonnes : `id` · `club_id` · `profile_id` · `slot` (`primary` / `secondary`) · `role` (`owner` / `manager` / `member`) · `is_active` · `joined_at` · `ended_at` · `end_reason`.
- Invariants posés **dès ce lot**, même si seules les créations les exercent. Ils exigent l'extension **`btree_gist`** (disponible mais non installée sur le staging, vérifié le 28/10 en lecture seule), à installer par la migration B2 :
  - exclusion `(profile_id, slot) WHERE is_active`, **DEFERRABLE** ;
  - unique partiel `(club_id, profile_id) WHERE is_active` ;
  - exclusion « 1 OWNER actif par club », DEFERRABLE.

**`private.membership_events`** (append-only, non exposée) : `joined` à la création, `club_created` dans le payload.

**`public.user_blocks`** : `(blocker_id, blocked_id)` PK · `created_at` · CHECK `blocker_id <> blocked_id`. Commandes `block_user` / `unblock_user` serveur, **sans UI** dans ce lot.

**Helpers `private.*`** (SECURITY DEFINER, `search_path=''`, EXECUTE retiré à PUBLIC, anon **et authenticated**, invariant P4 existant) :
- `uid()` ;
- `is_onboarded(uid)` ;
- `is_blocked_between(a, b)` ;
- `is_club_member(club, uid)` ;
- `is_club_manager(club, uid)` (OWNER ou manager actif) ;
- `active_membership_count(uid)` ;
- `has_active_sanction(uid)` : **renvoie toujours false** tant que la table des sanctions n'existe pas (Phase 5). C'est documenté et testé, pour que la séquence d'ADR-0004 (« sanction vérifiée ») soit déjà câblée ;
- `normalize_search(text)` IMMUTABLE : minuscules + suppression des accents par `translate()` sur une table fixe, **sans extension** (D-48).

**Policies RLS et helpers.** Une policy s'exécute avec les droits de l'appelant, qui n'a pas le droit d'exécuter `private.*`. Comme pour les avatars (`storage_policies`), les prédicats utilisés par les policies passent par un schéma dédié **`rls_policies`**, non exposé par l'API : usage à `authenticated` seulement, fonctions SECURITY DEFINER minces qui délèguent à `private.*` et renvoient un booléen (`rls_policies.can_see_profile(id)`, `rls_policies.can_see_club(id)`).

### 4.2 Commandes `api.*` (Definition of Done d'ADR-0004 : R1 autorisation, R2 EXECUTE, R3 `search_path`, R4 abus)
| Commande | Autorisation (R1) | Règles et erreurs codées | Abus (R4) |
|---|---|---|---|
| `create_club(p_request_id, p_name, p_description, p_platform, p_languages, p_level, p_recruiting_open, p_recruiting_positions)` | onboardé (`UNAUTHENTICATED` sinon) ; `assert_session_active` non requis (action non sensible) | `CONFLICT` (nom déjà pris, comme le pseudo à l'onboarding), `LIMIT_REACHED` (2 affiliations), `RATE_LIMITED` (1 création / 24 h, D-21), `VALIDATION` | idempotence `private.idempotency_keys` (rejeu → même réponse) ; `private.rate_limits` ; verrou `FOR UPDATE` sur les adhésions actives du créateur (course C7) |
| `update_club(p_request_id, p_club_id, p_expected_updated_at, champs…)` | `is_club_manager` sur **le club ciblé** | `FORBIDDEN`, `CONFLICT` (verrou optimiste), `NOT_FOUND` (club dissous ou invisible), `VALIDATION` | idempotence ; rate limit léger |
| `search_clubs(p_q, p_platform, p_languages, p_level, p_recruiting_only, p_position, p_cursor, p_limit ≤ 20)` | onboardé | lecture **SECURITY INVOKER** (sous RLS) ; exclut les clubs dissous et ceux dont l'OWNER est bloqué ou bloquant (B) ; curseur `(search_name, id)` | `p_limit` plafonné ; `p_q` ≤ 32 caractères |
| `block_user(p_request_id, p_target)` / `unblock_user(p_request_id, p_target)` | soi | `VALIDATION` (soi-même, cible inconnue) | idempotence ; rate limit |

Codes d'erreur : uniquement la liste canonique de `docs/03` §4. `src/lib/errors/rpc.ts` connaît déjà `UNAUTHENTICATED`, `FORBIDDEN`, `VALIDATION`, `CONFLICT`, `ALREADY_HANDLED`, `EXPIRED` et `RATE_LIMITED` ; B0 y ajoute **`NOT_FOUND`** et **`LIMIT_REACHED`**, déjà prévus par `docs/03`. Aucun code nouveau. Convention existante : `raise exception using message = '<CODE>', errcode = 'P0001'`.

La création ajoute dans la même transaction le club, l'adhésion OWNER (slot calculé) et l'événement. Aucune écriture directe sur les tables : INSERT, UPDATE et DELETE sont refusés à `authenticated`.

### 4.3 RLS (matrice P2, testée en pgTAP)
| Table | SELECT `authenticated` | INSERT / UPDATE / DELETE | `anon` |
|---|---|---|---|
| `clubs` | `rls_policies.can_see_club(id)` : lecteur onboardé, et (`status = 'active'` sans blocage avec l'OWNER, ou club dont il est/a été membre) | ∅ (commandes uniquement) | ∅ |
| `club_memberships` | adhésions actives de tout club visible (effectif CLB-05), **sauf les membres avec qui un blocage existe** ; inactives : soi + managers du club | ∅ | ∅ |
| `user_blocks` | lignes où je suis `blocker_id` | ∅ | ∅ |
| `profiles` (existante) | **modifiée** : + `rls_policies.can_see_profile(id)` (non bloqué, B) ; soi toujours visible | inchangé | ∅ |
| Avatars (`storage.objects`, existante) | **modifiée** : `private.avatar_is_visible` ajoute le contrôle B | inchangé | ∅ |
| `private.membership_events` | non exposée | — | — |

Garanties existantes inchangées : D-38 (`rls_auto_enable`, `ensure_rls`), privilèges par défaut fermés (A-2), P4 (aucune fonction `api` ou `private` exécutable par PUBLIC ou anon), P5 (`search_path=''`), D-40 sur les actions sensibles, CSP à nonce.

### 4.4 Contrat applicatif
`src/features/clubs/contract.ts` et `src/features/explore/contract.ts` (Zod), écrits **en premier** :
- entrées et sorties des commandes ;
- codes d'erreur → messages FR (`src/lib/errors`) ;
- sérialisation des filtres d'URL (`?q=&platform=&lang=&level=&recruiting=1&position=&cursor=`) avec valeurs par défaut et rejet des valeurs inconnues.

---

## 5. Composants réutilisables (design system P2-A, galerie d'abord)

| Composant | Couche | Rôle | Réutilisé par |
|---|---|---|---|
| `SegmentedControl` | `ui/` | intentions Jouer / Clubs (/ Joueurs plus tard) ; liens `aria-current`, cibles ≥ 44 px | Explorer, Mes clubs |
| `SearchField` | `ui/` | champ de recherche avec effacement, `type="search"`, 16 px (pas de zoom iOS) | Explorer, futurs annuaires |
| `FilterBar` | `patterns/` | 2–3 filtres fréquents en chips + bouton « Filtres (n) » | Explorer Clubs, Jouer, Joueurs |
| `FilterSheet` | `patterns/` | panneau complet (Sheet existante), Appliquer / Réinitialiser | idem |
| `RemovableChip` | `ui/` (existe) | chips effaçables des filtres actifs | idem |
| `ClubMonogram` | `ui/` | initiales du club sur surface, en attendant D-43 | cartes, fiche, Mes clubs |
| `ClubCard` | `patterns/` | identité, plateforme, langues, niveau **déclaré**, badge recrutement, postes recherchés (3 maximum + « +n ») | Explorer, Mes clubs |
| `ClubQuickSheet` | `features/clubs/components` | fiche rapide : description, postes, taille de l'effectif, « Voir le club » | Explorer |
| `ClubHero` | `patterns/` | en-tête de fiche club | fiche club, gestion |
| `RosterSection` | `features/clubs/components` | effectif groupé GK/DEF/MID/ATT (règle pure dans `rules.ts`, Vitest) | fiche club |
| `Stepper` | `patterns/` | étapes courtes, extraites de l'onboarding (A3) | `/clubs/new`, onboarding |
| `LoadMore` | `ui/` | pagination par curseur, bouton explicite (pas de défilement infini en v1) | listes |

Règles : pas de classes Tailwind brutes pour les surfaces, boutons et listes (master plan §3.2 n° 3). Chaque composant passe d'abord par la galerie `/dev/ui` (données **fictives réservées à la galerie**, jamais servies sur Vercel), avec axe, CSP, cibles de 44 px et Reduce Motion.

---

## 6. Recherche et filtres

- **Côté serveur** : la page `/explore/clubs` lit `searchParams`, valide par Zod et appelle `api.search_clubs`. Elle rend la liste en Server Component. Aucun état client n'est nécessaire pour les résultats.
- **Filtres fréquents visibles :**
  - Plateforme : défaut = plateforme du joueur, effaçable ;
  - Recrute : défaut activé ;
  - Poste : suggestion = poste principal, désactivé par défaut.
- **Panneau :** langue(s), niveau déclaré.
- **Recherche texte (D-48) :** nom du club, 2 à 32 caractères, insensible à la casse et aux accents. Comparaison `search_name LIKE '%' || normalize_search(q) || '%'` avec échappement de `%` et `_`. **Aucune extension** : pas de `pg_trgm` ; `unaccent` non utilisé car non installé (et non IMMUTABLE). Validation explicite (bouton Rechercher ou clavier), sans requête à chaque frappe en v1.
- **Chips effaçables** pour chaque filtre actif, plus « Tout effacer ».
- **Mémoire par intention (S-4.4) :** l'URL porte l'état ; la dernière URL de chaque segment est gardée en `sessionStorage` (confort par lecteur, lecture et écriture en try/catch). Le retour arrière restaure les filtres. La position de défilement est restaurée par le navigateur et, à défaut, par l'ancre du dernier club ouvert.
- **Tri v1 :** clubs qui recrutent d'abord, puis par nom. Aucun tri par popularité ou activité (pas de donnée fiable).
- **Pagination :** 20 par page, curseur, « Afficher plus ».

---

## 7. Interactions et états

| Écran | États |
|---|---|
| Explorer Clubs | chargement (squelettes de cartes) · résultats · **aucun club sur CPC** (« Aucun club pour l'instant » + « Créer un club ») · **aucun résultat avec ces filtres** (« Effacer les filtres ») · erreur (réessayer) · hors ligne (bandeau existant) |
| Carte / fiche rapide | recrutement ouvert (badge vert) · **recrutement fermé** (badge neutre) · **déjà membre** (badge « Ton club ») · **deux affiliations occupées** (note discrète sur la fiche, sans bouton) |
| Explorer Jouer | état vide véridique : « Aucune session ouverte pour l'instant. » Aucune carte, aucun compteur, aucun bouton « Demander l'accès » |
| `/clubs/new` | étape invalide (erreur en ligne) · `CONFLICT` (nom déjà pris) · `LIMIT_REACHED` (2 affiliations : explication + lien Mes clubs) · `RATE_LIMITED` (heure de la prochaine création possible) · envoi en cours (verrou) |
| Fiche club | club introuvable ou dissous → 404 · effectif vide (impossible : OWNER au minimum) · gestion visible seulement pour OWNER et manager |
| Réglages | `CONFLICT` (modifié ailleurs : rechargement et explication) · `FORBIDDEN` (page 404) |

Accessibilité : contrôle segmenté annoncé comme navigation ; chips effaçables étiquetées (« Retirer le filtre PS5 ») ; résultats annoncés (`role=status` « 12 clubs ») ; Reduce Motion respecté ; contrastes AA (tokens D-41).

---

## 8. Découpage en PR indépendantes

Une PR par story. DB et UI avancent en parallèle sur le contrat fusionné.

| # | PR | Contenu | Dépend de | Tests |
|---|---|---|---|---|
| B0 | **Contrat** (docs + `contract.ts`) | ADR-0005 (`/explore/clubs`, `/explore/play`, `/clubs/new`, `/clubs/[clubId]`, `/clubs/[clubId]/manage/settings`), codes d'erreur, matrice RLS, décisions D-21/D-23/D-45/D-46 consignées, `CLAUDE.md` (lot autorisé) | GO | Vitest sérialisation des filtres |
| B1 | **DB socle** | helpers `private.*`, `user_blocks`, `block_user` / `unblock_user`, policy `profiles` + B | B0 | pgTAP P2–P6 `user_blocks` et `profiles`+B, P4/P5 globaux |
| B2 | **DB clubs** | `clubs`, `club_memberships`, `membership_events`, `create_club`, `update_club` | B1 | pgTAP 2 tables × personas, invariants (≤ 2 affiliations, 1 OWNER, 1 PRIMARY), idempotence, rate limit ; **course C7** (deux créations concurrentes avec un seul slot libre ; C8 arrive avec l'inversion PRIMARY↔SECONDARY) |
| B3 | **DB recherche** | `search_clubs`, index, `pg_trgm` si disponible | B2 | pgTAP filtres, B, clubs dissous exclus, curseur, plafond |
| B4 | **UI primitives** | SegmentedControl, SearchField, FilterBar, FilterSheet, ClubMonogram, ClubCard, LoadMore, Stepper (extrait) dans la galerie | B0 | e2e galerie (axe, CSP, 44 px, Reduce Motion) Chromium + WebKit |
| B5 | **UI clubs** | `/clubs/new`, `/clubs/[id]`, `/clubs/[id]/manage/settings`, Profil > Mes clubs | B2, B4 | e2e Supabase local : création → fiche → réglages ; refus 2 affiliations ; 24 h ; FORBIDDEN |
| B6 | **UI Explorer** | `/explore` → segments, Clubs (liste, filtres URL, chips, fiche rapide, pagination), Jouer (vide véridique) | B3, B4 | e2e : filtres + retour arrière + scroll ; deux comptes (A crée, B trouve) ; blocage (B ne voit pas le club de A) ; Vitest règles et URL |
| B7 | **QA Preview** | campagne iPhone, captures, rapport `docs/26` | B1–B6 fusionnées | grille QA, comptes `qa_*` |

Parallélisme : B1 → B2 → B3 (DB, en série) et B4 (UI, en parallèle) ; B5 après B2 et B4 ; B6 après B3 et B4.

---

## 9. Stratégie de déploiement Preview

1. **Ordre de fusion :** une PR DB est fusionnée, puis sa migration est appliquée au staging (`apply_migration` après `get_project_url` = `cglbsllwdmluvbisozyx`). Suivent `list_migrations`, `get_advisors`, l'alignement du nom de fichier sur la version du staging et les requêtes d'invariants P2/R2/R3 en lecture seule (D-35).
2. **Aucune UI avant sa base :** B5 et B6 ne sont fusionnées qu'après application au staging de B2 et B3. La Preview ne montre donc jamais un écran sans table.
3. **`preview`** est synchronisée par avance rapide seulement, sur GO, après la CI verte de `main`. Seule la branche `preview` construit (Ignored Build Step) ; **aucune Production**.
4. **Données :** aucune donnée de club pré-remplie. Sur le staging, les clubs sont créés **par l'interface** depuis 2 ou 3 comptes `qa_*@example.test`, avec des noms préfixés « QA ». Ils sont supprimés en fin de campagne, avec les comptes, par un script de nettoyage remis à Selim.
5. **Retour arrière :** chaque migration est livrée avec un script de rollback remis à Selim, comme pour le lot 2 de la Phase 1. Une UI fautive est retirée en annulant sa PR, sans toucher la base.

---

## 10. Décisions à prendre avant le GO

| ID | Décision | Recommandation |
|---|---|---|
Toutes tranchées par Selim le 28/10/2026 à 19:43 (registre `docs/02`).

| ID | Décision | Statut |
|---|---|---|
| D-45 | Explorer Clubs = premier lot fonctionnel vertical (socle indispensable + création de club + Explorer Clubs) ; recrutement au lot suivant | ✅ |
| D-21 | Joueur onboardé ; 2 affiliations maximum ; PRIMARY puis SECONDARY ; créateur OWNER ; 1 création / 24 h | ✅ |
| D-23 | Clubs visibles uniquement des utilisateurs authentifiés **autorisés** (onboardés, sans blocage) ; jamais anon | ✅ |
| D-43 | Blasons reportés ; monogrammes temporaires | ✅ (report) |
| D-46 | Aucune mention de candidature tant que le parcours n'existe pas | ✅ |
| D-47 | Segment Jouer visible avec un état vide véridique, sans données ni actions fictives | ✅ |
| D-48 | Recherche simple par nom, insensible à la casse et aux accents, sans `pg_trgm` ; normalisation par `translate()` (aucune extension) | ✅ |
| — | Trois onglets Accueil / Explorer / Profil conservés ; le créateur reste joueur, droits OWNER et manager contextuels et contrôlés côté serveur | ✅ |

---

## 11. Critères d'acceptation du lot

1. Un joueur onboardé crée un club en 3 étapes ; il en devient OWNER sur le bon slot ; un deuxième envoi identique ne crée rien (idempotence).
2. Avec 2 affiliations, ou dans les 24 h suivant une création, la création est refusée avec un message clair. pgTAP et e2e passent.
3. La fiche club affiche des données exclusivement réelles. L'effectif est groupé GK/DEF/MID/ATT et les rôles sont visibles.
4. « Gérer le recrutement » n'apparaît que pour OWNER et manager. Un autre compte reçoit 404 sur `/manage/settings` et `FORBIDDEN` sur `update_club` (pgTAP).
5. Explorer Clubs liste uniquement des clubs actifs, visibles des seuls authentifiés. Filtres plateforme, recrute, poste, langue et niveau ; chips effaçables ; « Tout effacer ».
6. Filtres dans l'URL ; le retour arrière restaure filtres et position. Chaque segment garde ses propres filtres.
7. Un club dont l'OWNER m'a bloqué, ou que j'ai bloqué, n'apparaît ni dans la recherche ni par URL directe (pgTAP + e2e deux comptes).
8. Jouer affiche un état vide véridique. Joueurs est absent. Aucun chiffre, badge ou bouton sans donnée.
9. Les états vides se distinguent : aucun club sur CPC, et aucun résultat avec ces filtres.
10. Garanties inchangées : P1–P10, D-38, A-2, P4, P5, CSP à nonce (aucune violation en Chromium ni WebKit), axe 0 critique ou sérieux, cibles ≥ 44 px, Reduce Motion.
11. CI 5/5 verte sur chaque PR ; migrations appliquées au staging après fusion, advisors sans nouvelle alerte ERROR.
12. Démo Preview iPhone (clair et sombre) avec deux comptes QA : A crée un club, B le trouve dans Explorer, ouvre la fiche rapide puis la fiche, revient en arrière avec ses filtres intacts.

---

## 12. Suite après ce lot (indicatif)

- **P2-C2 Recrutement** : candidature avec message facultatif depuis la carte et la fiche, décision par le manager, invitations club, Mes invitations, profil d'autrui. Les états « candidature active » d'EXP-02 sont alors complets.
- **P2-G Radar**, puis **P2-H LIVE** : Explorer Jouer passe aux vraies sessions.
- **Explorer Joueurs** (managers, D-11), avec la disponibilité prouvée par le Radar.

G2 reste HOLD. Aucun travail sur CPC V1 ni sur COMMAND DIRECT.
