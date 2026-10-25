# CPC V2 — 09 · Rapport G1 final · Contrôles d'isolation

**Version :** 2 (finale) — 25/10/2026, ~22:25 (Paris). Remplace le rapport G1 partiel de 22:15.
**Exécutant :** Claude · **Mode :** lecture seule stricte. Aucun commit, clone, migration, création ou modification de projet ; aucune valeur secrète lue. Seul SQL exécuté : des `SELECT` de catalogue, sous le rôle `supabase_read_only_user` en transaction `read_only = on`.
**Légende :** ✅ OK · ❌ KO · ⚠️ observation · ⬜ non vérifié (jamais compté comme OK)

---

## 1. Connexions MCP de la session

| # | Contrôle | Preuve | Verdict |
|---|---|---|---|
| MCP-1 | Nouveau connecteur `supabase-cpc-v2` présent | `RefreshMcpTools` → 13 outils `mcp__supabase-cpc-v2__*` | ✅ |
| MCP-2 | **Connexion limitée au projet** | Aucun outil de niveau compte : pas de `list_projects`, `list_organizations`, `get_project`, `create_project`, `pause_project`… ; aucun paramètre `project_id` dans les outils, donc **aucun autre projet ne peut être ciblé** | ✅ |
| MCP-3 | **Lecture seule** | Outils d'écriture absents (`apply_migration`, `deploy_edge_function`, `create_branch`, `merge_branch`…) ; SQL exécuté sous `supabase_read_only_user`, `transaction_read_only = on` | ✅ |
| MCP-4 | Connecteur COMMAND DIRECT inchangé | `mcp__Supabase__list_projects` rejoué : org « COMMAND DIREct », projets `<projet-hors-CPC-1>` et `<projet-hors-CPC-2>`, identiques | ✅ |
| MCP-5 | CPC V1 hors de portée Supabase | connecteur COMMAND DIRECT : `get_project(cfgvtyxiggewauevvigm)` → permission refusée ; connecteur V2 : ciblage impossible par construction (MCP-2) | ✅ |
| MCP-6 | Aucun MCP Claude Code local, projet ou global | `~/.claude.json` sans `mcpServers` ; aucun `.mcp.json` ; aucune config managée | ✅ |

## 2. Supabase V2 — `cglbsllwdmluvbisozyx`

| # | Contrôle | Appel | Résultat brut | Verdict |
|---|---|---|---|---|
| SB-1 | Identité du projet | `get_project_url` | `https://cglbsllwdmluvbisozyx.supabase.co` | ✅ conforme à la ref fournie |
| SB-2 | Ref distincte de V1 et des autres | comparaison | ≠ `cfgvtyxiggewauevvigm`, ≠ `<projet-hors-CPC-1>`, ≠ `<projet-hors-CPC-2>` | ✅ |
| SB-3 | Aucune table utilisateur | `list_tables(public)` ; `SELECT` sur `pg_tables` hors schémas système | `[]` ; 0 table | ✅ |
| SB-4 | Aucune migration | `list_migrations` | `[]` | ✅ |
| SB-5 | Aucune Edge Function | `list_edge_functions` | `[]` | ✅ |
| SB-6 | Aucune branche | `list_branches` | `[]` | ✅ |
| SB-7 | Aucune donnée | `count(*)` sur `auth.users` et `storage.buckets` | 0 et 0 | ✅ |
| SB-8 | Aucun pont vers un autre Postgres | `pg_foreign_server`, `pg_user_mappings` ; extensions | 0 et 0 ; `postgres_fdw`, `dblink` et `wrappers` **non installées** | ✅ |
| SB-9 | Aucun secret ni rôle ajouté | `vault.secrets` (count) ; rôles non standard | 0 et 0 | ✅ |
| SB-10 | Extensions installées | `list_extensions` | `plpgsql`, `pgcrypto`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault` (socle standard) ; `pg_cron` disponible, non installée | ✅ |
| SB-11 | Schémas | `pg_namespace` | `auth, extensions, graphql, graphql_public, public, realtime, storage, vault` (standard) | ✅ |
| SB-12 | Event triggers | `pg_event_trigger` | 6 triggers standard Supabase (`pgrst_*`, `issue_pg_*`, `issue_graphql_placeholder`) + **`ensure_rls`** | ⚠️ voir §4.1 |
| SB-13 | Advisors sécurité | `get_advisors(security)` | 2 alertes WARN, portant toutes deux sur `public.rls_auto_enable()` | ⚠️ voir §4.1 |
| SB-14 | Région | — | l'outil `get_project` est volontairement absent du connecteur scopé ; eu-west-2 reste **déclaré** | ⬜ voir §4.3 |
| SB-15 | Organisation V2 distincte de celle de V1 | — | non lisible via un connecteur scopé ; mais le connecteur V2 ne peut pas atteindre V1, et le connecteur COMMAND DIRECT non plus | ⬜ (sans impact sur l'isolation des accès) |

## 3. GitHub et Vercel (contrôles de 22:15, toujours valides)

| # | Contrôle | Verdict |
|---|---|---|
| GH-1→4 | `cpc-v2` privé, vide (0 ref, 0 commit), pas de fork ni de template, nom distinct de V1 | ✅ |
| GH-5 | V1 `CPC` inaccessible depuis la session (403) | ✅ |
| GH-6 | Le token a les droits admin et push sur `cpc-v2` ; limitation procédurale jusqu'au GO | ⚠️ |
| GH-7 | Protection de `main` : impossible avant le premier commit | ⬜ |
| GH-8 | Webhooks, deploy keys, secrets Actions : non lisibles via le proxy | ⬜ (confirmation visuelle par Selim conseillée) |
| VC-1 | Aucun projet Vercel lié à `cpc-v2` | ✅ |
| VC-2/3 | `cpc-admin`, `cpc-admin-mmjb`, `cpc-web-beta` : liés au repo V1, ajoutés à ADR-0016 | ⚠️ nature à confirmer |

---

## 4. Observations

### 4.1 ⚠️ Fonction `public.rls_auto_enable()` + event trigger `ensure_rls`
- **Ce qu'elle fait :** après chaque `CREATE TABLE` dans `public`, elle active automatiquement la RLS sur la nouvelle table. Propriétaire `postgres`, `SECURITY DEFINER`, `search_path = pg_catalog`.
- **Origine :** présente alors que le projet n'a aucune migration. Elle a très probablement été installée par l'option « activer la RLS automatiquement » proposée à la création du projet ; c'est une déduction, car le catalogue ne trace pas l'origine. Elle n'a aucun lien avec V1.
- **Risque réel :** faible. C'est une fonction de type `event_trigger`, que Postgres refuse d'exécuter hors d'un événement DDL. L'advisor la signale quand même parce que `anon` et `authenticated` ont le droit `EXECUTE` et qu'elle est dans le schéma exposé.
- **Recommandation (à appliquer seulement après le GO, dans la migration n°0) :** **garder** le mécanisme, cohérent avec V-05 (RLS partout), et `REVOKE EXECUTE` de la fonction pour `PUBLIC`, `anon` et `authenticated`. Advisors attendus à 0 ensuite. Le test global R2 d'ADR-0004 couvrira aussi le schéma `public`.
- **Non bloquant pour G1.**

### 4.2 ⚠️ Accès hérités hors Supabase
Le connecteur Vercel couvre toute l'équipe, avec des outils d'écriture sur les 7 projets V1. Il est maîtrisé par la procédure (ADR-0016, contrôle d'ID avant chaque appel), pas par le droit technique. Recommandation inchangée : désactiver Shopify, Higgsfield et Blotato dans les conversations CPC V2.

### 4.3 ⬜ Région (D-34)
Le connecteur scopé ne permet pas de lire la région. Valeur déclarée : eu-west-2 (Londres). **À trancher avant la première migration** : une fois des données présentes, changer de région impose de recréer le projet et de tout migrer.

### 4.4 Connecteur pour la Phase 1
`supabase-cpc-v2` est en lecture seule, ce qui convient pour G1. Les migrations de la Phase 1 exigeront une variante **sans `read_only`, toujours limitée par `project_ref`**, à activer uniquement au GO et à valider par une nouvelle vérification MCP-2.

---

## 5. Verdict G1

# ✅ G1 VALIDÉ — isolation confirmée

| Environnement | Verdict |
|---|---|
| Supabase `cglbsllwdmluvbisozyx` | ✅ vide, isolé, aucun pont vers un autre Postgres ; connecteur limité au projet et en lecture seule |
| GitHub `cpc-v2` | ✅ privé, vide, sans historique V1 ; session sans accès à V1 |
| Vercel | ✅ aucun projet V2 lié |
| COMMAND DIRECT | ✅ inchangé |
| CPC V1 | ✅ hors de portée Supabase et GitHub · ⚠️ joignable via Vercel (procédure ADR-0016) |

**G1 ne vaut pas GO.** La Phase 1 reste en **HOLD** jusqu'à ton GO explicite (checklist 08 §F). Avant le GO, il reste à :
1. trancher **D-34** (garder eu-west-2 ou recréer le projet vide en eu-west-3) ;
2. confirmer la nature des 3 projets Vercel liés à V1 (non bloquant) ;
3. au moment du GO : activer la variante du connecteur Supabase en écriture, toujours limitée à `project_ref`, et donner à Claude l'accès en écriture au seul repo `cpc-v2`.

Remédiations prévues pour le premier lot, **après GO uniquement** : `REVOKE EXECUTE` sur `rls_auto_enable()` (§4.1), protection de `main` après le premier commit (GH-7).
