# CPC V2 — 27 · Brief d'exécution B1 : sécurité et blocages (P2-B)

- **Statut :** 🟢 **GO B1 donné (Selim, 28/10/2026 20:23)** : développement, tests et PR. Fusion et application au staging : GO suivant. Réalisation : migration `20261028200000_p2b_b1_security_blocks.sql`, rollback `supabase/rollback/20261028200000_p2b_b1_rollback.sql`, tests `070_blocks_rls.test.sql` (51 assertions) et `000_global_invariants.test.sql` (+5).
- **Statut initial :** 🟡 PRÊT POUR GO. Ce brief est autonome : un **GO B1** unique autorise la PR, sa CI, puis, **après fusion et sur un GO distinct « application staging B1 »**, l'application de la migration au staging.
- **Contrat de référence :** `docs/26` §2.1, §3 (`block_user`), §4 (`user_blocks`, `profiles`).
- **Périmètre :** base de données uniquement. Aucune UI, aucun club, aucune donnée sur le staging.

---

## 1. Objectif

Poser le socle d'autorisation dont dépendent les clubs (B2) et la recherche (B3) :
- un **blocage** appliqué côté serveur, sans interface pour l'instant ;
- des **helpers** d'autorisation centralisés ;
- un schéma **`rls_policies`** pour que les policies puissent les appeler sans ouvrir `private`.

La première conséquence visible est un **resserrement** : un profil bloqué devient invisible. Aucun accès nouveau n'est ouvert.

## 2. Contenu de la migration `supabase/migrations/<ts>_p2b_b1_security_blocks.sql`

1. **Helpers `private`** (SECURITY DEFINER, STABLE, `set search_path = ''`, `revoke execute … from public, anon, authenticated, service_role`) :
   - `private.uid()` : `auth.uid()` si le profil existe et n'est pas supprimé, sinon `NULL` ;
   - `private.is_onboarded(p_uid)` ;
   - `private.is_blocked_between(p_a, p_b)` : `exists` dans `user_blocks` dans un sens ou dans l'autre ; `false` si l'un des deux est `NULL` ;
   - `private.has_active_sanction(p_uid)` : **stub `false`**, avec un commentaire SQL qui le dit (sanctions en Phase 5).
2. **Table `public.user_blocks`** :
   - `blocker_id` et `blocked_id` : uuid FK `profiles`, `on delete cascade` ;
   - `created_at`, PK `(blocker_id, blocked_id)`, CHECK `blocker_id <> blocked_id` ;
   - index `(blocked_id)` pour les recherches dans l'autre sens ;
   - RLS activée ; policy SELECT `blocker_id = (select auth.uid())` ;
   - `revoke all … from anon, authenticated` puis `grant select … to authenticated`. Aucun INSERT, UPDATE ou DELETE client.
3. **Schéma `rls_policies`** :
   - `revoke all on schema rls_policies from public` ; `grant usage … to authenticated` (jamais `anon`) ;
   - non ajouté aux schémas exposés par PostgREST.

   `rls_policies.can_see_profile(p_profile_id)` : SECURITY DEFINER, STABLE, `search_path = ''`. Renvoie `p_profile_id = auth.uid() or not private.is_blocked_between(auth.uid(), p_profile_id)`. EXECUTE à `authenticated` seulement.
4. **Policy `profiles` modifiée** (`drop policy` puis `create policy profiles_select_authenticated`, même nom) :
   ```sql
   using ((deleted_at is null and rls_policies.can_see_profile(id)) or id = (select auth.uid()))
   ```
   `profile_positions` suit automatiquement (sous-requête sur `profiles`).
5. **Avatars** : `private.avatar_is_visible` est recréée en ajoutant `and not private.is_blocked_between(auth.uid(), p.id)` pour les dossiers d'autrui. La signature ne change pas et les policies Storage restent intactes.
6. **Commandes** `api.block_user(p_request_id uuid, p_target uuid)` et `api.unblock_user(…)` :
   - séquence ADR-0004 : identité → idempotence → validation (`p_target` ≠ soi, profil existant non supprimé, sinon `VALIDATION`) → rate limit `block_user`, 30 par heure → `insert … on conflict do nothing` / `delete` → `idempotency_keys` → `{data:{blocked}, server_now}` ;
   - `revoke execute … from public, anon` ; `grant execute … to authenticated`.
7. **Script de rollback** `supabase/rollback/<ts>_p2b_b1.sql` (non appliqué automatiquement) : il restaure la policy `profiles` et `avatar_is_visible` d'origine, puis supprime les commandes, le schéma `rls_policies`, `user_blocks` et les helpers.

## 3. Tests (CI, Supabase local)

**`supabase/tests/database/070_blocks_rls.test.sql`**, personas de `docs/26` §1 (créés dans la transaction de test, puis rollback) :

| # | Vérification | Attendu |
|---|---|---|
| 1 | `anon` sur `user_blocks` | ⛔ privilège |
| 2 | Z bloque O via `api.block_user` | `{blocked:true}` ; 1 ligne |
| 3 | Rejeu du même `request_id` | même réponse, toujours 1 ligne |
| 4 | Z lit `user_blocks` | voit sa ligne |
| 5 | O lit `user_blocks` | 0 ligne (il ne sait pas qui l'a bloqué) |
| 6 | Z lit le profil de O ; O lit le profil de Z | 0 ligne des deux côtés |
| 7 | A lit les profils de O et de Z | visibles |
| 8 | O lit son propre profil | visible (soi toujours) |
| 9 | `profile_positions` de O pour Z | 0 ligne |
| 10 | Avatar de O pour Z (`storage_policies.avatar_readable`) | false ; pour A : true |
| 11 | `block_user` sur soi, sur un uuid inconnu | `VALIDATION` |
| 12 | INSERT, UPDATE ou DELETE direct sur `user_blocks` par `authenticated` | ⛔ |
| 13 | `unblock_user`, puis relecture | profils de nouveau visibles |
| 14 | Rate limit : 31ᵉ blocage dans l'heure | `RATE_LIMITED` |
| 15 | `has_active_sanction` | false (stub documenté) |

**`000_global_invariants.test.sql`** étendu :
- P4 : aucune fonction de `rls_policies` exécutable par `anon` ;
- `rls_policies` ne contient aucune table ;
- la liste des schémas exposés reste `public`, `api` (contrôle de `pgrst.db_schemas` si disponible en local, sinon test documenté).

**Non-régression :** toute la suite pgTAP existante et les e2e Supabase (profil, avatar, onboarding) passent **sans modification**.

## 4. Procédure staging (seulement après fusion **et** GO « application staging B1 »)
1. `get_project_url` doit renvoyer `https://cglbsllwdmluvbisozyx.supabase.co`, sinon arrêt.
2. `apply_migration` avec le contenu exact du fichier fusionné.
3. `list_migrations` : relever la version enregistrée et aligner le nom du fichier par une PR technique (D-35).
4. `get_advisors` sécurité et performance : aucune nouvelle alerte ERROR. Les WARN sont listés dans le rapport.
5. Requêtes d'invariants en lecture seule :
   - P2 : RLS partout ;
   - R2/P4 : `has_function_privilege` sur `api`, `private`, `rls_policies` ;
   - R3/P5 : `proconfig` ;
   - `rls_auto_enable()` et `ensure_rls` présents (D-38).
6. **Aucune donnée créée.** Le staging ne contient que le compte QA existant, et aucun blocage n'est créé sur le staging.

## 5. Critères d'acceptation B1
1. Migration et pgTAP verts en CI ; CI 5/5.
2. Matrice `docs/26` §4 (`user_blocks`, `profiles`, avatars) entièrement couverte et verte.
3. P2, P4 (étendu à `rls_policies`), P5, D-38 et A-2 inchangés ou renforcés.
4. Aucun changement visible dans l'application, la Preview ni les e2e existants.
5. Rollback fourni et relu.
6. Après application au staging (GO distinct) : advisors sans nouvelle ERROR, invariants rejoués et joints au rapport.

## 6. Risques et parades
| Risque | Parade |
|---|---|
| La policy `profiles` appelle une fonction par ligne (coût) | fonction STABLE, `auth.uid()` en sous-sélection ; volumétrie faible ; `explain` joint à la PR |
| Erreur d'écriture de policy qui masquerait son propre profil | clause `id = auth.uid()` en OR, test n° 8 |
| Exposition involontaire de `rls_policies` | pas d'ajout aux schémas PostgREST ; test d'invariant ; contrôle `get_advisors` |
| Fuite par les avatars | test n° 10 |
| Oracle « qui m'a bloqué » | test n° 5 ; aucune lecture côté bloqué |

## 7. Hors B1
UI de blocage et de signalement (Phase 5) ; annulation des candidatures et invitations au moment d'un blocage (ajoutée avec P2-D) ; clubs et adhésions (B2).
