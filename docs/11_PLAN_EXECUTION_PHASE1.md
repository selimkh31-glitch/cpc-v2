# CPC V2 — 11 · Permissions d'écriture + plan d'exécution Phase 1 (S-1.1 → S-1.12)

**Date :** 25/10/2026, ~22:35 · **Statut :** ⏸ HOLD. Ce document est un **plan** : aucun commit, aucune migration, aucune modification de configuration n'a été effectué.

---

## A. Décisions enregistrées (Selim, 22:25)

| ID | Décision | Statut |
|---|---|---|
| G1 | Validé | ✅ |
| D-34 | Staging conservé en **eu-west-2 (Londres)** | ✅ |
| D-36 | Production future : **projet Supabase séparé**, préférence **Paris (eu-west-3)** | ✅ (création par Selim en Phase 7) |
| ADR-0016 | `cpc-admin`, `cpc-admin-mmjb`, `cpc-web-beta` exclus de tout accès en écriture CPC V2 | ✅ |
| D-38 | `public.rls_auto_enable()` : **ne jamais la supprimer automatiquement** ; durcissement proposé ci-dessous, soumis à validation | 🔵 |

---

## B. Vérification des permissions d'écriture (aucun test d'écriture effectué)

| Accès | Constat | Verdict |
|---|---|---|
| **Supabase `supabase-cpc-v2-write`** | `get_project_url` → `https://cglbsllwdmluvbisozyx.supabase.co` ; `list_migrations` → `[]` ; outils d'écriture présents (`apply_migration`, `execute_sql`, `deploy_edge_function`, `create_branch`…) ; **aucun outil de niveau compte** (`list_projects`, `list_organizations`, `create_project`…) ; aucun paramètre `project_id` | ✅ écriture possible, **sur V2 uniquement** |
| **Supabase `supabase-cpc-v2`** (lecture seule) | inchangé, conservé pour les contrôles | ✅ |
| **GitHub `cpc-v2`** | rattaché à la session en mode *read* ; le token a déjà les droits `push` et `admin` sur ce repo ; V1 `CPC` → 403 ; aucun autre repo dans la session | ✅ prêt. Au GO, je le rattache en mode *push* : changement du périmètre de session, pas de configuration du repo |
| **GitHub Actions** | `GET /actions/runs` lisible (0 run) | ✅ je pourrai lire les résultats de CI comme preuves |
| **Vercel** | aucun projet V2 ; le connecteur garde un accès en écriture à toute l'équipe, V1 compris | ⚠️ **aucune écriture Vercel prévue en Phase 1** ; le projet Vercel V2 sera créé par toi |
| **COMMAND DIRECT** (connecteur `Supabase`) | non modifié. **Incident** : un appel en lecture (`list_organizations`) a été fait par erreur à 22:3x, après ta consigne « ne jamais toucher ». Aucun effet. | ⚠️ ce connecteur ne sera plus appelé dans cette conversation |

**Contraintes du workspace qui structurent le plan**
| Constat | Conséquence |
|---|---|
| Docker installé mais **sans démon** | pas de Supabase local dans le container, donc **pgTAP, courses et e2e tournent dans GitHub Actions**, où Docker est disponible ; je lis les résultats via l'API |
| `*.supabase.co` bloqué depuis le container | l'app ne peut pas tourner contre le staging depuis ici ; le staging sert aux migrations (via MCP) et aux advisors |
| Node 22, pnpm 10, Playwright + Chromium, registre npm accessible | scaffold, lint, typecheck, Vitest et build sont exécutables localement |
| Supabase CLI absent du container | installé dans la CI (action officielle) ; localement via `pnpm dlx` si besoin, sans démarrer de stack |

---

## C. `public.rls_auto_enable()` : analyse complète (lecture seule)

| Élément | Valeur constatée |
|---|---|
| Signature | `public.rls_auto_enable()` → `event_trigger`, plpgsql, volatile |
| Propriétaire | `postgres` |
| Sécurité | `SECURITY DEFINER`, `search_path = pg_catalog` (verrouillé, conforme R3) |
| ACL | `NULL`, soit les droits par défaut de Postgres : **`EXECUTE` à `PUBLIC`**. D'où l'exécution possible par `anon`, `authenticated`, `authenticator`, `service_role`, `supabase_read_only_user` (vérifié avec `has_function_privilege`) |
| Dépendants | **1** : l'event trigger `ensure_rls` (propriétaire `postgres`, actif, sur `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO`), dépendance normale. Un `DROP FUNCTION` échouerait sans `CASCADE`, et `CASCADE` supprimerait le trigger |
| Dépendances | langage plpgsql et schéma `public` uniquement ; **n'appartient à aucune extension** |
| Comportement | après chaque création de table dans `public`, exécute `ALTER TABLE … ENABLE ROW LEVEL SECURITY` ; journalise ; ignore les autres schémas |
| Commentaire | aucun |

**Évaluation**
- Utile : filet de sécurité aligné avec V-05 (RLS partout).
- Risque d'exposition faible : une fonction `event_trigger` ne peut pas être invoquée hors d'un événement DDL. C'est ce que vérifiera le test RA-2.
- Limite : ne couvre que `public`. Nos migrations activeront la RLS **explicitement** sur chaque table, et un test global le vérifiera.

**Durcissement proposé (D-38, à valider, appliqué seulement en migration n°0 après GO)**
1. **Conserver** la fonction et le trigger, sans aucune suppression.
2. Retirer le droit `EXECUTE` à `PUBLIC`, `anon`, `authenticated` et `service_role`. Le propriétaire `postgres`, qui exécute les migrations, le conserve. Révoquer ce droit n'empêche pas l'event trigger de se déclencher : le contrôle `EXECUTE` s'applique aux appels directs, pas au déclenchement par un événement DDL. Le test RA-3 le prouvera.
3. Ajouter un commentaire documentant l'origine plateforme et la décision D-38.
4. Tests pgTAP associés :
   | # | Test |
   |---|---|
   | RA-1 | `anon`, `authenticated` et `service_role` n'ont plus `EXECUTE` |
   | RA-2 | un appel direct échoue (fonction de trigger non appelable) |
   | RA-3 | après le REVOKE, une table créée dans `public` par une migration de test a bien la RLS activée |
   | RA-4 | l'event trigger `ensure_rls` existe toujours et reste actif |
   | RA-5 | advisors sécurité : 0 alerte après application sur le staging |

---

## D. Mode opératoire Git et Supabase (à valider avec le GO)

| ID | Sujet | Proposition |
|---|---|---|
| D-35 | **Chemin unique d'application des migrations au staging** | Les fichiers de `supabase/migrations/` sont la source. Ils sont testés en CI sur un Supabase local. Après fusion, **Claude les applique au staging via `apply_migration`**, sous le même nom, une par une, puis compare `list_migrations` aux fichiers du repo et lance `get_advisors`. Aucun `supabase db push` en Phase 1, donc aucun secret Supabase dans GitHub. |
| D-37 | **Qui fusionne les PR** | Claude ouvre une PR par story ou petit lot ; **Selim fusionne**. Option : Selim autorise Claude à fusionner quand la CI est verte. |
| D-39 | **Premier commit** | Seul commit direct sur `main` : documentation uniquement (aucun code). Ensuite, Selim active la protection de `main` (PR obligatoire + CI verte) ; tous les commits suivants passent par PR. |

---

## E. Plan d'exécution Phase 1

Ordre strict ; chaque étape se termine par une PR et des **preuves d'exécution** (sorties CI liées). Un test non lancé est noté NON EXÉCUTÉ.

### Étape 0 — Bootstrap documentaire (commit direct sur `main`, D-39)
- **Contenu :** `README.md`, `.gitignore`, `CLAUDE.md` (interdits V1, gates, conventions, règle de preuve), `docs/` (SPEC, ARCHI, dossier 00→11, ADR 0001→0016, registre), `docs/reference/` (cahier UX s'il est fourni).
- **Ensuite (Selim) :** protection de `main`.
- **Preuve :** hash du commit ; `git ls-tree` du commit.

### PR-1 — S-1.1 Scaffold
- `create-next-app` en dernière version stable, épinglée : App Router, `src/`, TypeScript strict, Tailwind v4, ESLint ; pnpm ; next-intl (FR) ; shadcn/ui init ; Vitest ; config Playwright (projets iPhone, Pixel, Desktop) ; arborescence du document 05 ; `.env.example` (noms seulement) ; `scripts/check-no-v1.sh` ; règles ESLint (`getSession` interdit côté serveur, `dangerouslySetInnerHTML` interdit, import de `lib/supabase/admin.ts` restreint) ; en-têtes de sécurité de base dans `next.config`.
- **Preuves locales :** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, avec leurs sorties.

### PR-2 — S-1.2 CI GitHub Actions
- Jobs : `lint` · `typecheck` · `unit` · `build-no-sentry` (aucune variable Sentry, ADR-0012) · `gitleaks` · `check-no-v1` · `db` (Supabase CLI, `supabase start`, `supabase db reset`, `supabase test db`) · `e2e-smoke` (build + start contre le Supabase local, Playwright mobile et desktop).
- **Preuve :** run vert, lu via l'API GitHub ; lien du run.

### PR-3 — S-1.3 Migrations socle (aucune donnée réelle)
| # | Migration | Contenu |
|---|---|---|
| 0000 | `platform_hardening` | D-38 (si validé) : REVOKE sur `rls_auto_enable`, commentaire |
| 0001 | `schemas_extensions` | schémas `api` et `private` ; `citext` ; privilèges par défaut révoqués pour `anon` et `authenticated` |
| 0002 | `enums` | `platform` (3), `position_code` (15) + fonction immuable de groupe (GK/DEF/MID/ATT) |
| 0003 | `identity` | `profiles`, `profile_positions`, `account_settings`, `notification_preferences` ; RLS explicite ; GRANT par colonne |
| 0004 | `technical` | `private.idempotency_keys`, `private.rate_limits` |
| 0005 | `authz_helpers` | `private.staff_members`, `private.uid()`, `is_onboarded()`, `is_staff()` |
- **Seed** synthétique : 9 personas `qa_…@example.test`.
- **Tests pgTAP :** P2 (RLS des 4 tables), P4 (EXECUTE global), P5 (search_path global), « toutes les tables de `public` ont la RLS », RA-1 à RA-4.
- **Après fusion :** `apply_migration` ×6 sur le staging (D-35), puis `list_migrations` (6 entrées attendues), puis `get_advisors` sécurité (0 attendu, RA-5), puis `generate_typescript_types` → `src/types/database.ts` (PR de suivi).

### PR-4 — S-1.4a Spike auth (préalable à la levée de la réserve d'ADR-0002)
- Exécuté en CI contre le Supabase local, avec Mailpit pour les emails ; durée de JWT réduite **dans `supabase/config.toml` local uniquement**.
- A1, A2, A3, A4, A5, A7, A8 : automatisés.
- **A6 (Google OAuth) : NON EXÉCUTABLE en CI** (un vrai fournisseur Google est requis). Le volet « confirmation d'email PKCE » d'A6 est automatisé ; le volet Google sera exécuté sur Vercel Preview une fois le projet Vercel et le client Google créés. **La réserve d'ADR-0002 ne sera pas levée avant.**
- **Preuve :** rapport Playwright (artefact CI) ; attributs réels des cookies consignés dans ADR-0002.

### PR-5 — S-1.4 Auth
- Inscription, connexion, confirmation, mot de passe oublié, déconnexion ; bouton Google affiché **seulement si** sa configuration est déclarée présente (pas de bouton factice) ; réauthentification récente.
- **Preuves :** e2e inscription → email (Mailpit) → confirmation → login ; P10 partiel.

### PR-6 — S-1.5 Garde d'accès
- Redirection vers le login avec retour à un chemin interne uniquement ; `/admin` en `notFound()` pour les non-staff (vérifié côté serveur et en RPC).
- **Preuves :** e2e T-14 (volet admin et `/messages` anonyme) ; test anti open redirect.

### PR-7 — S-1.6 Onboarding : première commande `api.complete_onboarding`
- Migration 0006 : la commande, avec la DoD complète d'ADR-0004 (R1 personas, R2 EXECUTE, R3 search_path, R4 abus : rejeu `request_id`, pseudo déjà pris, postes invalides, âge non confirmé, appel anonyme).
- UI : pseudo, plateforme, poste principal et ≤ 3 secondaires, déclaration d'âge (`AGE_MIN = 18`, TEMPORAIRE).
- **Preuves :** pgTAP, e2e, puis application au staging et advisors.

### PR-8 — S-1.7 Shell 3 onglets ⛔ bloqué tant que le cahier UX n'est pas fourni
- Header (emplacements Radar, messages, notifications), TabBar Accueil / Explorer / Profil, pages vides véridiques.

### PR-9 — S-1.8 Kit d'états UX
- Skeleton, vide, erreur, timeout, hors ligne, interdit, expiré, conflit ; règle « succès seulement après le serveur ».

### PR-10 — S-1.9 Profil et avatar privé
- Édition par panneaux ; migration 0007 : buckets **privés** `avatars` et `crests`, policies Storage ; URL signées de 10 min (plafond 15).
- **Preuves :** tests S1–S9 d'ADR-0015 (S3 : non-révocation documentée ; S4 : expiration), avec un TTL réduit en environnement de test pour l'expiration.

### PR-11 — S-1.10 + S-1.11 Accessibilité, légal, PWA
- axe-core sans violation critique ; cibles ≥ 44 px ; reduced motion ; squelettes `/legal/*` ; `manifest.ts`.

### PR-12 — S-1.12 Observabilité optionnelle
- `lib/observability` ; Sentry actif seulement si `SENTRY_ENABLED=true` et qu'un DSN est présent.
- **Preuves :** job `build-no-sentry` vert + journal de `pnpm dev` sans aucune variable Sentry → levée de la réserve d'ADR-0012.

### Clôture — Gate G2
Rapport de phase avec, pour chaque critère de la checklist 08 §G, le lien du run CI ou du journal. Les éléments non exécutables (A6 Google, démo Preview) restent **NON EXÉCUTÉS** tant que le projet Vercel n'existe pas.

---

## F. Prérequis au GO et pendant la Phase 1

| Élément | Requis pour | Qui |
|---|---|---|
| GO explicite (checklist 08 §F) | tout | Selim |
| Validation D-35, D-37, D-38, D-39 | étape 0 et PR-3 | Selim |
| Rattachement de `cpc-v2` en mode *push* | étape 0 | Claude, au GO |
| Protection de `main` | après l'étape 0 | Selim |
| Cahier UX `.docx` | PR-8 et suivantes | Selim |
| Projet Vercel V2 + client Google OAuth + Resend | A6 Google, démo Preview, gate G2 | Selim |
| Secrets GitHub | **aucun** en Phase 1 | — |

## G. Garde-fous permanents
- Écritures **uniquement** via `supabase-cpc-v2-write` et sur le repo `cpc-v2`. Le connecteur `Supabase` (COMMAND DIRECT) n'est **jamais** appelé dans les conversations CPC V2.
- Aucune écriture Vercel en Phase 1 ; les 7 projets V1 restent exclus (ADR-0016).
- Avant chaque `apply_migration` : `get_project_url` doit renvoyer `cglbsllwdmluvbisozyx`.
- Aucune suppression de `rls_auto_enable()` ni de `ensure_rls`.
- Aucun test déclaré PASS sans preuve d'exécution.
