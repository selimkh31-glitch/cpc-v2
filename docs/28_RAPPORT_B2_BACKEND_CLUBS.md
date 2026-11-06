# CPC V2 — Rapport B2 : Backend Clubs (travail en PR)

**Statut : en validation CI.** Aucun SQL B2 appliqué sur le staging, aucune modification Production.

## Livrables

- Migration additive 20261106132000_p2b_b2_clubs.sql : tables clubs / club_memberships, audit private.membership_events, niveaux, rôles, slots, recrutement, RLS et commandes.
- Exclusions différables grâce à btree_gist : un PRIMARY et un SECONDARY maximum par joueur, un OWNER actif maximum par club, une affiliation active unique par couple joueur/club.
- Commandes create_club et update_club avec droits contextuels serveur, idempotence, prévention des créations simultanées par verrou, limite d'une création par 24 heures glissantes et verrou optimiste des modifications.
- Normalisation des noms sans unaccent ni pg_trgm, selon les vecteurs D-48.
- Contrat TypeScript corrigé pour distinguer description absente (inchangée) et description vide (effacée).
- Tests Supabase local : 080_clubs_rls (23 assertions), 090_cmd_create_update_club (30 assertions), script C7 multi-connexions intégré à CI.
- Rollback protégé : il refuse de supprimer les tables si une donnée club, affiliation ou audit existe.

## Gates

1. CI 5/5 et C7 verts, avec tests réellement exécutés.
2. Revue de sécurité : permissions, profils bloqués, propriétaire unique, tentatives IDOR, mutation concurrente, absence d'écriture directe.
3. Fusion seulement du SHA testé.
4. Application exclusive au staging cglbsllwdmluvbisozyx, suivie des advisors, contrôles RLS et alignement de la version enregistrée.
5. La Preview n'affiche aucune nouvelle interface tant que B4/B5/B6 ne sont pas prêts.

## Risques et réserves

- La liste d'acceptation de noms SQL couvre les caractères latins utilisés dans les vecteurs et les noms usuels. Certains caractères Unicode Latin rares acceptés par JavaScript peuvent être refusés par la RPC ; cette divergence doit être documentée ou corrigée avant l'ouverture publique.
- Les contraintes défèrent la vérification jusqu'à COMMIT : tester C7 en deux connexions réelles.
- Les clubs ne peuvent pas encore être rejoints : candidatures/invitations sont livrées dans le lot Recrutement.
- La suppression et la gouvernance détaillée arrivent dans des lots séparés.
- Le niveau de club et les postes recherchés sont déclaratifs, aucune donnée EA inventée.

La présente PR n'autorise ni application au staging ni mise en ligne Production avant son verdict final.
