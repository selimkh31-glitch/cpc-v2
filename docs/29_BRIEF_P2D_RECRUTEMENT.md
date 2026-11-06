# CPC V2 · P2-D0 — Contrat des candidatures et contrôles de sécurité

**Statut : en préparation. Aucune migration, RPC ni CTA public créé par ce lot.** La phase P2-B est livrée sur la Preview protégée. La prochaine tranche verticale est P2-D : candidature, décision du manager, confirmation éventuelle du remplacement du SECONDARY.

## Sources du projet

- `docs/04_SCHEMA_SUPABASE_RLS.md` §2.2 et §5 : `club_applications`, statuts, unicité, commandes `apply_to_club`, `withdraw_application`, `decide_application`, `confirm_membership_replacement`.
- `docs/06_BACKLOG_V2.md` : S-2.4/S-2.5, scénarios T-01 et T-02.
- `docs/02_DECISIONS_CONSOLIDEES.md` : D-21 et D-23 ✅ ; D-13 et D-22 **proposées, pas validées**.
- `docs/25_BRIEF_P2B_EXPLORER.md` : D-46 ✅, pas de CTA candidature avant backend fonctionnel.

## Tranche de livraison cible

1. **D1 (SQL / RLS)** : créer `public.club_applications` (aucune insertion directe), statut, FKs, index unique actif par couple club-joueur, `expires_at` serveur, lectures RLS uniquement candidat et managers du club, invisibilité des blocages dans les réponses externes.
2. **D2 (commandes)** : idempotence par `request_id`, auto-vérification auth + onboarding + sanction, rate limits, sérialisation du verrou sur le joueur et le club, audit, `apply_to_club`, `withdraw_application`, `decide_application`.
3. **D3 (acceptation)** : sous 2 affiliations, l'acceptation ajoute une seule affiliation dans le slot libre ; avec 2 affiliations, **aucune adhésion n'est retirée automatiquement**. Passage à `awaiting_player_confirmation` et remplacement du SECONDARY exclusivement après consentement explicite.
4. **D4 (UI)** : formulaire dans fiche club uniquement si `recruiting_open`, non membre et non déjà candidat ; état « Candidature envoyée », retrait, écran « Candidatures » dans les outils du club, acceptation/rejet ; espace joueur pour confirmer le remplacement si nécessaire. Pas de bouton prématuré.
5. **D5 (preuves)** : pgTAP RLS matriciels, fonctions non exécutables par anon, SQL `search_path=''`, course T-01/T-02 multi-connexions, double clic, cas blocage, club fermé, propriétaire/manager hors club, deux slots, expiration, UI iPhone et WebKit. Tests locaux, puis staging après fusion et revue.

## Décisions bloquantes — NE PAS LES RÉÉCRIRE COMME VALIDÉES

- **D-22 : expiration automatique** : 14 jours pour candidatures, 7 jours pour invitations et 72 heures pour transferts sont des propositions. Ne pas graver ces durées dans la migration ni traiter la valeur comme décidée sans validation de Selim. `expires_at` doit être calculé au serveur.
- **D-13 : remplacement SECONDARY** : l'OWNER d'un club avec d'autres membres doit transférer son club ; un manager qui remplace son affiliation perd son rôle. Les deux points demeurent à confirmer. Tant que non confirmés, refuser ce remplacement côté SQL (fail-closed), sans effet destructif.
- Codes d'erreur : les réponses RPC publiques utilisent uniquement les codes canoniques de `src/lib/errors/rpc.ts`. L'existence d'un blocage n'est jamais révélée comme un oracle.

## Règles non négociables

Ne jamais exposer `service_role` dans Next.js, ouvrir des RLS à anon, créer des faux joueurs/clubs sur le staging, ni écrire dans CPC V1. La Preview P2-B reste protégée ; aucune mise en production ni migration D1 sans gates CI et revue du SQL.
