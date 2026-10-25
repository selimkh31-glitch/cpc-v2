# CPC V2 — 12 · Rapport post-fusions (Phase 1, lot 1)

**Date :** 26/10/2026 ~00:15 · **Autorisation :** Selim, 25/10/2026 23:58 · **Périmètre :** `selimkh31-glitch/cpc-v2` et Supabase staging `cglbsllwdmluvbisozyx` uniquement.

## 1. Fusions (méthode : commit de fusion, SHA de HEAD verrouillé)
| PR | HEAD testé | Checks au moment de la fusion | Commit de fusion sur `main` | Arbre fusionné = arbre testé |
|---|---|---|---|---|
| #1 S-1.1 scaffold | `c2e9752` | aucun (la CI arrive avec #2) ; tests locaux joints à la PR | `363b5f3` | ✅ |
| #2 S-1.2 CI | `2594100` | quality, gitleaks, db, e2e ✅ (run 40237534766) | `4bcaed7` | ✅ |
| #3 S-1.4a spike auth | `db9ea8a` | quality, gitleaks, db, e2e, e2e-webkit ✅ (run 40241744778) | `4cf9e74` | ✅ |

Aucun conflit, aucun changement inattendu. Les PR #2 et #3 ont été rebasculées sur `main` avant fusion (diff identique au testé).

## 2. CI sur `main` — run [40242770932](https://github.com/selimkh31-glitch/cpc-v2/actions/runs/40242770932), commit `4cf9e74` : ✅
| Job | Résultat |
|---|---|
| quality (lint, typecheck, Vitest 20/20, check-no-v1, build sans Sentry) | ✅ |
| gitleaks | ✅ |
| db (pgTAP 10/10 : invariants P2/R2/R3 + Realtime P8) | ✅ |
| e2e (smoke Chromium + spike : 12 réussis, 2 ignorés) | ✅ |
| e2e-webkit (smoke iPhone : 3/3) | ✅ |

**Répétition A5a ×3** sur le code exact de `main` (run [40242799367](https://github.com/selimkh31-glitch/cpc-v2/actions/runs/40242799367), branche jetable `diag/a5-stabilite`, sans retry) : **3/3 ✅**. Constat constant : immédiatement après déconnexion globale, l'action sensible renvoie encore `ok` (limite D-40) ; après expiration du JWT, la page est sur `/login` et l'accès privé est refusé.

## 3. Résultats A1–A8 (état sur `main`)
| Scénario | Statut |
|---|---|
| Anonyme → page privée redirigée | ✅ |
| A1, A2, A3, A4 | ✅ |
| A5a (refus après expiration) | ✅ (×1 en PR, ×1 sur main, ×3 en répétition) |
| A5b (révocation immédiate) | ⏸ `fixme` — D-40 |
| A6 email PKCE | ✅ |
| A6 Google | ⬜ NON EXÉCUTÉ (Vercel Preview + client Google requis) |
| A7, A8 | ✅ |

## 4. Migrations appliquées au staging
| Fichier (repo) | Version staging | Nom | SQL | Vérifications |
|---|---|---|---|---|
| `20261025231000_realtime_user_channel.sql` (renommé, voir note) | `20261025231000` | `realtime_user_channel` | identique au fichier de `main` (sha256 `ee945c2a…`) | policy présente (SELECT, `authenticated`, prédicat exact, commentaire) ; 0 policy anon/public ; 0 policy d'écriture ; RLS active |

Prérequis vérifiés avant application : `realtime.messages` présente avec RLS, `realtime.topic()`, `auth.uid()`, colonne `extension`, aucune policy existante, grant SELECT `authenticated`, 0 migration. Contrôle `get_project_url` = `https://cglbsllwdmluvbisozyx.supabase.co` juste avant.

**Note de version (D-35) :** le connecteur MCP horodate la migration à l'application (`20261025231000`) ; le fichier avait été daté `20261025230000`. Le fichier est **renommé** dans cette PR pour que l'historique du dépôt et celui du staging coïncident. Règle ajoutée : après chaque `apply_migration`, aligner le nom de fichier sur la version enregistrée.

## 5. Invariants sur le staging après migration
| Invariant | Staging | Commentaire |
|---|---|---|
| P2 — RLS sur toutes les tables exposées | ✅ 0 table sans RLS | |
| R2 — aucune fonction api/private exécutable par anon | ✅ 0 | |
| R3 — search_path fixé sur les SECURITY DEFINER de public | ✅ 0 manquant | |
| **R2 — aucune SECURITY DEFINER de public exécutable par anon** | ❌ **1** : `public.rls_auto_enable()` | fonction de plateforme préexistante (D-38) ; durcissement (REVOKE) **non encore appliqué** ; advisors sécurité : 2 WARN sur cette seule fonction |
| `ensure_rls` / `rls_auto_enable()` présents (D-38 : ne jamais supprimer) | ✅ | |

**Trou de test identifié :** l'invariant R2 passe en CI parce que `rls_auto_enable()` n'existe pas sur le Supabase local. Correctif proposé dans le lot suivant : migration D-38 conditionnelle (REVOKE si la fonction existe) + exécution des requêtes d'invariants **sur le staging** après chaque migration (lecture seule).

## 6. ADR-0002 et D-40
- **ADR-0002 : 🟡** — A1–A4, A5a, A6 email, A7, A8 prouvés. Réserve maintenue : A6 Google (environnement absent) et A5b / D-40.
- **D-40 : 🟡 validé sous conditions** — JWT 10–15 min à tester en staging ; contrôle serveur de session active pour les actions sensibles ; tests de révocation immédiate avant généralisation ; aucune promesse de révocation immédiate. Garanties et limites documentées dans ADR-0002.

## 7. Écarts et points ouverts
- `main` **non protégée** (aucune règle, aucun check requis) : à activer par Selim (PR obligatoire + checks quality, gitleaks, db, e2e, e2e-webkit).
- Branche `diag/a5-stabilite` : jetable, à supprimer manuellement (le proxy refuse la suppression à Claude).
- ADR-0017 (rendu dynamique, CSP à nonce) : fusionné avec #1, statut 🔵 à confirmer par Selim.
- Aucun déploiement Vercel, aucune Phase 2.

## 8. Prochain lot Phase 1 (proposé, non démarré)
1. **S-1.3 migrations socle** : D-38 (REVOKE conditionnel + tests RA-1→RA-5), schémas `api`/`private`, enums (plateformes, 15 postes), tables identité, helpers ; invariants vérifiés en CI **et** sur le staging.
2. **D-40 étape 1** : test en staging d'un JWT à 10–15 min (changement de configuration Auth, à autoriser), puis conception du contrôle de session active (commande `private.session_is_active()`) et tests A5b.
3. **S-1.4 / S-1.5** : auth définitive (remplace `/spike/session`), garde d'accès, `/admin` en `notFound`.
4. **S-1.6** : onboarding, première commande `api.complete_onboarding` avec la Definition of Done d'ADR-0004.
