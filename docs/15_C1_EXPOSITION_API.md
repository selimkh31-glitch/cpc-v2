# CPC V2 — 15 · C-1 : exposition du schéma `api` sur le staging

**Autorisation :** Selim, 26/10/2026 09:12 (GO contrôlé, staging `cglbsllwdmluvbisozyx` uniquement).
**Appliqué :** 26/10/2026 ≈ 09:16, via le connecteur `supabase-cpc-v2-write` (projet vérifié par `get_project_url`).

## 1. Inventaire avant changement (lecture seule)
| Élément | Constat |
|---|---|
| Objets du schéma `api` | **2 fonctions**, aucune table, vue, séquence ni type |
| `api.assert_session_active()` | SECURITY DEFINER, `search_path=''` ; EXECUTE : authenticated ✅ · PUBLIC ❌ · anon ❌ · service_role ❌ |
| `api.complete_onboarding(…)` | SECURITY DEFINER, `search_path=''` ; EXECUTE : authenticated ✅ · PUBLIC ❌ · anon ❌ · service_role ❌ |
| USAGE sur le schéma `api` | authenticated ✅ · anon ❌ · PUBLIC ❌ · service_role ❌ |
| Contrôles serveur | aucun paramètre d'identité (toujours `auth.uid()`), codes d'erreur stables, idempotence par `request_id` |
| Configuration PostgREST | aucune surcharge `pgrst.db_schemas` en base : valeurs par défaut de la plateforme |

**Aucune fonction ni permission non prévue** → condition d'arrêt non déclenchée.

**Constat latent** (sans effet aujourd'hui) : les `ALTER DEFAULT PRIVILEGES IN SCHEMA … REVOKE … FROM public` de la migration fondations n'ont aucun effet. Une future fonction `api` sans `REVOKE` explicite serait exécutable par tout utilisateur connecté. Correctif proposé : PR #17 (migration + 2 invariants), à appliquer sur autorisation.

## 2. Changement
```sql
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, api';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
```
- `public` et `graphql_public` sont conservés (valeurs par défaut de Supabase ; les deux schémas existent).
- **Aucun GRANT ajouté** : la documentation Supabase suggère `GRANT ALL … TO anon, authenticated, service_role`. Ce n'est volontairement **pas** fait, les permissions minimales restent celles des migrations.
- Conséquence documentée par Supabase : la liste « Exposed schemas » du tableau de bord ne pilote plus ce réglage. Toute modification passe par cette commande.

## 3. Vérifications après changement
| Contrôle | Méthode | Résultat |
|---|---|---|
| Configuration enregistrée | `pg_db_role_setting` du rôle `authenticator` | `pgrst.db_schemas=public, graphql_public, api` ✅ |
| Alertes de sécurité | `get_advisors` | 0 WARN (3 INFO attendus : tables `private` sans policy) ✅ |
| Anonyme interdit sur `api` | inventaire : anon sans USAGE ni EXECUTE ; test d'isolation n° 13 (26/10 08:4x) | refusé ✅ |
| Isolation de deux utilisateurs | test d'isolation 14/14 (rejoué en base, simulation des rôles et JWT comme PostgREST, transaction annulée) | ✅ |
| Révocation des sessions et actions sensibles | test en base sur `auth.sessions` | **NON EXÉCUTÉ** : l'appel a été refusé deux fois côté permissions (« cancelled »), non contourné. Couvert en CI par pgTAP 040 et e2e A5b. |
| `complete_onboarding` via HTTP | appel REST au staging | **NON EXÉCUTÉ** : l'environnement de travail ne peut pas joindre le staging en HTTP (liste d'accès réseau). |

## 4. Limites et suite
- Les tests HTTP réels (anonyme 401/403, deux utilisateurs, révocation, onboarding) demandent un client capable de joindre le staging. Le futur Vercel Preview, ou un job CI muni de secrets fournis par Selim, permettra de les exécuter.
- Retour arrière :
```sql
alter role authenticator reset pgrst.db_schemas;
notify pgrst, 'reload config';
```
