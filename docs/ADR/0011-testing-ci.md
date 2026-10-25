# ADR-0011 — Stratégie de test et CI

- **Statut :** ✅ VALIDÉ (Selim, 25/10, 21:55). **Tous les tests de permissions et de concurrence sont conservés et obligatoires.**
- **Date :** 25/10/2026 · **Révision :** v3 (inventaire explicite)

## Outils
Vitest (règles pures, schémas) · pgTAP via `supabase test db` sur Supabase local · scripts de course multi-connexions (`tests/race/`, connexions Postgres réelles et simultanées, pas de simulation en mémoire) · Playwright (iPhone, Pixel, Desktop) + axe-core · gitleaks · `scripts/check-no-v1.sh`.

## Inventaire non négociable : permissions
| Famille | Contenu | Portée |
|---|---|---|
| P1 Personas | anonyme, A, B, manager A, manager B, OWNER A, admin, bloqué, sanctionné | toutes les tables et commandes |
| P2 RLS par table | SELECT / INSERT / UPDATE / DELETE pour chaque persona ; aucune écriture directe sur une table « cmd » | chaque table exposée |
| P3 Commandes (ADR-0004 R1) | chemin nominal + chaque code d'erreur, pour chaque persona pertinent | chaque fonction `api.*` |
| P4 EXECUTE (R2) | test global : aucune fonction `api.*` exécutable par `anon`/`PUBLIC` ; aucune fonction `private.*` exécutable par `anon`/`authenticated` | toutes les fonctions |
| P5 search_path (R3) | test global : toute fonction SECURITY DEFINER a `search_path=''` ; advisors sécurité Supabase sans alerte | toutes les fonctions |
| P6 Abus (R4) | IDOR, falsification de paramètres, rejeu `request_id`, statut déjà traité, échéance dépassée, rate limit, blocage | chaque commande |
| P7 Storage | S1–S9 d'ADR-0015 : policies, expiration des URL signées, blocages, non-révocation documentée | buckets |
| P8 Realtime | souscription refusée aux canaux non autorisés | `user:`, `live:`, `club:` |
| P9 Admin | `/admin` et `api.staff_*` refusés aux non-staff (T-14) | routes + RPC |
| P10 Auth | spike A1–A8 (ADR-0002), token périmé et compte supprimé (T-18) | e2e |

## Inventaire non négociable : concurrence
| ID | Scénario | Spec |
|---|---|---|
| C1 | Deux managers déplacent le même joueur | T-05 |
| C2 | Acceptation d'invitation LIVE au moment de l'expiration | T-06 |
| C3 | Prolongation à l'échéance, avec coupure réseau | T-07 |
| C4 | Fermeture de session pendant une admission | T-08 |
| C5 | Transferts de propriété concurrents (refus puis acceptation) | T-09 |
| C6 | Double acceptation d'une même candidature ou invitation (idempotence) | APP-02, INV-03 |
| C7 | Adhésion concurrente vers 2 clubs avec un seul slot libre | CLB-01/02 |
| C8 | Inversion PRIMARY↔SECONDARY pendant une adhésion | CLB-01 |
| C9 | Radar actif et entrée en session simultanée | T-16 |
| C10 | Envoi de messages dupliqués (même `client_id`) | MSG-02 |
| C11 | Deux onglets qui rafraîchissent la session | ADR-0002 A3 |

Chaque test est introduit **dans la phase qui crée la fonctionnalité** (C1–C4 et C9 en Phase 3, C5–C8 en Phase 2, C10 en Phase 5, C11 en Phase 1). Une gate ne peut pas être franchie si un test de son périmètre manque ou échoue. **Un test ne peut être ni supprimé ni désactivé sans ADR et accord de Selim.**

## CI (chaque PR)
lint · typecheck · Vitest · Supabase local + pgTAP (P2–P9) · courses (C*) · build **sans variables Sentry** · Playwright smoke (mobile + desktop) · gitleaks · check-no-v1. Aucun secret requis pour les tests ; seul le déploiement des migrations vers staging en utilise.

## Règle
Aucun résultat déclaré PASS sans exécution réelle (SPEC §8) ; les rapports de gate joignent les sorties CI.
