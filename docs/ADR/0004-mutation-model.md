# ADR-0004 — Modèle de mutation : commandes transactionnelles

- **Statut :** 🟡 VALIDÉ SOUS RÉSERVE (Selim, 25/10/2026)
- **Réserves :** (R1) tests d'autorisation, (R2) restrictions EXECUTE, (R3) search_path sécurisé, (R4) tests d'abus — **pour chaque commande**

## Contexte
Les transitions critiques (adhésions, transferts, LIVE, terrain) écrivent des lignes appartenant à d'autres utilisateurs et touchent plusieurs lignes à la fois. Des policies d'écriture RLS seraient trop larges.

## Décision
- Les mutations sensibles passent par des fonctions `api.<commande>` en `SECURITY DEFINER`, appelées avec le JWT de l'utilisateur.
- Séquence obligatoire : identité (`auth.uid()` non nul, compte non supprimé, sanction vérifiée) → idempotence (`p_request_id`) → verrous `FOR UPDATE` dans un ordre fixe → autorisation sur le **club ciblé** → invariants → écritures, audit, notification, broadcast → `{data, server_now}`.
- Erreurs codées stables (`FORBIDDEN`, `CONFLICT`, `EXPIRED`, `ALREADY_HANDLED`…).
- Aucune écriture directe sur les tables sensibles. Seules exceptions : champs personnels sans invariant, encadrés par RLS et `GRANT UPDATE (colonnes)`.

## Definition of Done d'une commande (conditions de levée des réserves)
| Réserve | Preuve exigée | Contrôle automatique |
|---|---|---|
| R1 Autorisation | Test pgTAP par persona (anonyme, A, B, manager A/B, OWNER A, admin, bloqué, sanctionné) : nominal autorisé, tous les refus attendus | pgTAP en CI |
| R2 EXECUTE | `REVOKE EXECUTE … FROM PUBLIC, anon` ; `GRANT` à `authenticated` uniquement (staff : contrôle interne additionnel). Fonctions `private.*` non exécutables par `anon`/`authenticated`. | Test global sur `pg_proc` + `has_function_privilege` pour **toutes** les fonctions des schémas `api` et `private` ; échec en CI si une fonction n'est pas conforme |
| R3 search_path | `SET search_path = ''` sur chaque fonction SECURITY DEFINER ; objets qualifiés par leur schéma | Test global sur `pg_proc.proconfig` ; `get_advisors` sécurité Supabase sans alerte |
| R4 Abus | IDOR (UUID d'un autre club ou joueur), falsification de paramètres, rejeu (même `request_id`), statut déjà traité, échéance dépassée, rate limit, blocage, course multi-connexions si la commande verrouille plusieurs lignes | pgTAP + scripts `tests/race/` |

Une commande sans ces 4 preuves **ne peut pas être fusionnée**. L'inventaire complet des tests de permissions (P1–P10) et de concurrence (C1–C11) est dans ADR-0011 ; **il est conservé intégralement** (Selim, 25/10, 21:55). Le template de PR exige le lien vers les tests correspondants.

## Conséquences
Plus de SQL à écrire et à tester, en échange d'une surface d'attaque concentrée, auditée et testable.
