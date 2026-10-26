# CPC V2 — 16 · Audit des PR #11 à #19 avant fusion (lecture seule)

**Date :** 26/10/2026 ≈ 11:20 · **main de référence :** `a68101c` (CI [40305050453](https://github.com/selimkh31-glitch/cpc-v2/actions/runs/40305050453) : 5/5 jobs verts au premier essai — pgTAP 79/79, unitaires 20/20, Playwright 22/22 + WebKit 3/3, gitleaks OK).
**Règle :** aucune fusion ni migration avant GO de Selim.

## 1. État des PR
| PR | Story | Base | Head testé | CI du head | Fichiers | Migration | `main` inclus ? |
|---|---|---|---|---|---|---|---|
| #11 | S-1.7 navigation 3 onglets | `main` | `4671739` | ✅ 40293257624 | 16 | — | non |
| #12 | S-1.8 kit d'états UX | #11 | `79462a2` | ✅ 40293263405 | 16 | — | non |
| #13 | S-1.9 profil + avatar privé | #12 | `2f81326` | ✅ 40294489824 (pgTAP 95/95, PW 31/31) | 13 | `20261026100000_s19_avatars_storage` | non |
| #14 | S-1.10 accessibilité | #13 | `c39094a` | ✅ 40294501764 (PW 36/36) | 5 | — | non |
| #15 | S-1.11 légal provisoire + PWA | `main` | `ed4875c` | ✅ 40292628806 | 11 | — | non |
| #16 | C-2 tests préparés | `main` | `c511ebe` | ✅ 40293027379 | 3 | — | non |
| #17 | Privilèges par défaut des fonctions | `main` | `63b5464` | ✅ 40293721088 (pgTAP 81/81) | 2 | `20261026110000_default_function_privileges` | non |
| #18 | S-1.12 observabilité | `main` | `8e0456b` | ✅ 40295772108 | 14 | — | non |
| #19 | Docs C-1 (+ ce document) | `main` | — | à relancer | docs | — | oui |

**Conséquence :** tous les heads ont été testés **avant** #10 et #9. Aucun arbre testé ne correspond à l'arbre qui serait fusionné. Avant chaque fusion : intégrer `main` dans la branche, relancer la CI, fusionner verrouillé sur le SHA, puis vérifier que l'arbre de `main` est identique à celui du SHA testé (procédure du lot 2).

## 2. Chevauchements de fichiers
| Fichier | PR | Effet |
|---|---|---|
| `src/messages/fr.json` | #11, #12, #13, #15 | **conflit textuel #15** contre la chaîne #11→#14 (ajouts en fin de fichier) : résolution = union des clés |
| `playwright.config.ts` | #11, #16 | **conflit textuel #16** (#11 introduit `SUPABASE_SPECS`) : résolution = ajouter le projet `preview-c2` à la nouvelle structure |
| `src/proxy.ts` | #11, #15, #18 | aucun conflit ; fusion combinée vérifiée (compilation, lint, unitaires) |
| `.github/workflows/ci.yml`, `next.config.ts` | #13, #18 | aucun conflit |
| `src/app/(app)/layout.tsx`, `profile/page.tsx` | #11, #12, #13 | chaîne empilée, ordre imposé |

**Simulation locale** (branche jetable, jamais poussée), ordre `main → #11 → #12 → #13 → #14 → #17 → #18 → #19` : aucun conflit, `tsc` ✅, `eslint` ✅, **55/55 tests unitaires** ✅. #15 et #16 : uniquement les 2 conflits ci-dessus.

## 3. Matrice GO/HOLD
| PR | Recommandation | Conditions |
|---|---|---|
| #11 | **GO** | intégrer `main`, CI verte |
| #12 | **GO** après #11 | rebasculer la base sur `main` ; CI verte |
| #13 | **GO code** après #12 · **migration : HOLD** jusqu'à autorisation A-1 | CI verte. Le code fonctionne sur le staging seulement après A-1 : sans bucket, l'envoi d'avatar renvoie une erreur gérée (« l'avatar n'a pas pu être enregistré ») |
| #14 | **GO** après #13 | CI verte |
| #15 | **GO** après #14 | résoudre `fr.json`, CI verte ; textes légaux restant provisoires (D-19) |
| #16 | **GO** | résoudre `playwright.config.ts` après #11 ; ne change aucune configuration |
| #17 | **GO code** · **migration : HOLD** jusqu'à autorisation A-2 | recommandé **avant** toute nouvelle fonction `api` |
| #18 | **GO** | CI verte ; aucune variable Sentry requise |
| #19 | **GO** (documentation) | CI verte |

## 4. Ordre de fusion recommandé
1. **#17** (indépendant, sécurité, 2 fichiers) : ferme le risque latent avant tout nouveau code SQL.
2. **#11 → #12 → #13 → #14** (chaîne empilée : navigation → états → profil → accessibilité).
3. **#15** (résolution `fr.json`), puis **#18**, puis **#16** (résolution `playwright.config.ts`).
4. **#19** (documentation, en dernier pour refléter l'état final).

Après chaque fusion : CI verte sur `main` avant la suivante ; en cas de test rouge, arrêt et HOLD.

## 5. Autorisations nécessaires pour les migrations
| ID | Migration | Contenu | Effet sur le staging | Prérequis | Vérifications prévues | Retour arrière |
|---|---|---|---|---|---|---|
| **A-1** | `20261026100000_s19_avatars_storage` (#13) | bucket `avatars` privé (2 Mo, PNG/JPEG/WebP), 2 fonctions `private.*`, schéma `storage_policies` (2 fonctions), 4 policies `storage.objects`, contrainte `profiles_avatar_path_owner` | crée des objets Storage ; aucune donnée existante (0 utilisateur) | fusion de #13 ; `get_project_url` ; comparaison du SQL avec `main` | historique + md5 ; bucket privé ; policies ; R2/R3 sur les nouvelles fonctions ; advisors ; isolation (2 utilisateurs, transaction annulée) | `drop policy` ×4, `drop function` ×4, `drop schema storage_policies`, `delete from storage.buckets where id='avatars'` (bucket vide), `alter table … drop constraint profiles_avatar_path_owner` |
| **A-2** | `20261026110000_default_function_privileges` (#17) | `alter default privileges for role postgres revoke execute on functions from public` | aucune fonction existante modifiée ; ne vaut que pour les fonctions futures | fusion de #17 ; `get_project_url` | `pg_default_acl` (entrée globale postgres) ; invariants R2 rejoués ; création d'une fonction de test dans une transaction annulée | `alter default privileges for role postgres grant execute on functions to public` |

**Ordre conseillé d'application : A-2 puis A-1.** Les fonctions créées par A-1 sont alors fermées par défaut, en plus de leurs `REVOKE` explicites.

## 6. Écarts entre SQL versionné et staging
| Élément | Dépôt (`main`) | Staging | Écart |
|---|---|---|---|
| 6 migrations du lot 2 | noms `20261026073842` … `074149` | mêmes versions | **aucun** (md5 identiques) |
| Migration Realtime `20261025231000` | fichier avec saut de ligne final | enregistrée sans | contenu identique (md5 sans saut final `7f95a43…`) |
| Migrations #13 / #17 | non fusionnées | absentes | attendu |
| C-1 `pgrst.db_schemas` | **non versionné** (réglage de rôle, hors migrations) ; `config.toml` local expose déjà `api` | `public, graphql_public, api` | écart de nature : documenté dans `docs/15` ; à reproduire à la main pour la future production |

## 7. Statut réel de C-1
- **Configuration : appliquée** (26/10 ≈ 09:16) et toujours présente (`pg_db_role_setting` vérifié à 11:20).
- **Tests en base après changement : exécutés**, isolation 14/14 (simulation des rôles et du JWT comme PostgREST, transaction annulée).
- **Tests HTTP : NON EXÉCUTÉS** (anonyme 401/403, deux utilisateurs, révocation, `complete_onboarding`). L'environnement de travail ne joint pas le staging en HTTP.
- **Révocation de session sur le staging : NON EXÉCUTÉE** (refus côté permissions, non contourné). Couverte en CI (pgTAP 040, e2e A5b).
- **Limites :** la liste « Exposed schemas » du tableau de bord ne pilote plus le réglage ; les tests HTTP attendent la Preview (voir `docs/17`).

## 8. #16 et la configuration JWT
Diff limité à `docs/14_C2_PREPARATION_TESTS.md`, `tests/preview/c2-jwt-compat.spec.ts` et `playwright.config.ts` (projet `preview-c2` créé seulement si `E2E_TARGET=preview`). **Aucun fichier `supabase/` ni `.github/` modifié** ; `jwt_expiry` versionné inchangé (3600, local). Aucune configuration Auth du staging touchée.

## 9. Risques
- Dépôt **public** depuis le 26/10 ≈ 10:50 : spec, cahier UX, identifiant du Supabase V1 et adresse email de commit visibles. Revenir en privé demande un budget Actions.
- Consommation de la CI : chaque push lance 5 jobs (~10 min) ; les PR empilées multiplient les runs.
- ADR-0015 sous réserve tant que S2, S3 (blocages) et S6 (blasons) ne sont pas exécutables.
- Textes légaux provisoires : D-19 et D-12 ouverts.
