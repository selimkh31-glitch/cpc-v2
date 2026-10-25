# CPC V2 — Architecture technique et plan de réalisation

**Version :** proposition 0.1, 25 octobre 2026  
**Statut :** architecture à valider, **aucune exécution ni création de projet autorisée**  
**Référence fonctionnelle :** `CPC_V2_PRODUCT_SPEC.md` (v1.0) et `CPC_Cahier_UX_V1_Reference.docx`  
**Stratégie :** application web mobile-first, nouvelle base et nouveau dépôt, **aucune migration de données V1**.

## 1. Décisions confirmées / propositions

**Confirmé (source produit)**
- Une application contextuelle : Joueur, Manager et OWNER sur le même compte.
- Trois onglets : Accueil, Explorer, Profil. Messagerie et notifications contextuelles.
- Radar manuel 30/60/120 minutes, 120 par défaut ; seuls joueurs LIVE hors session sont disponibles dans Explorer Joueurs.
- LIVE de club séparé du Radar et de l'affiliation ; admission manager ou invitation préapprouvée ; terrain + banc.
- 1 PRIMARY + 1 SECONDARY maximum ; remplacement secondaire avec consentement.
- AUTOFILL gratuit, COMBLER Pro ; aucune donnée EA ni réputation inventée.
- Nouvelle application web, Supabase et Vercel neufs créés par le propriétaire, Claude Code développe.

**Propositions techniques** — révisables sur preuve :
- Next.js App Router + TypeScript strict, React, Tailwind CSS, composants accessibles (Radix/shadcn à évaluer), design tokens.
- Supabase Auth + Postgres/RLS + Realtime ; requêtes serveur/clients explicitement séparées.
- Une application principale Next.js et une **zone admin CPC isolée** par groupe de routes et contrôle serveur ; sous-domaine distinct recommandé avant production.
- Postgres comme arbitre de chaque transition métier critique : fonctions transactionnelles ciblées (RPC ou API serveur), contraintes SQL, journal d'événements.
- Realtime comme moyen de notification, **jamais source de vérité** : chaque événement provoque invalidation/rafraîchissement canonique.
- CI GitHub : lint, types, tests unitaires, tests DB/RLS, E2E Playwright, secret scanning, build et revue avant déploiement.
- Zod pour valider entrées/sorties aux frontières, génération de types Supabase et migrations SQL versionnées.

**Interdits** : réutiliser clés, URL, données, Auth, domaines ou base V1 ; se connecter par erreur au Supabase V1 ; exposer secret/service role ; créer des faux profils ou chiffres EA assimilables à des données réelles.

## 2. Topologie cible

```text
Navigateur mobile / desktop
   └── Next.js sur Vercel (UI + pages serveur + route handlers)
         ├── Supabase Auth (session web sécurisée)
         ├── API métiers (validation, autorisation, idempotence)
         ├── Supabase Postgres (contraintes, RLS, mutations atomiques)
         ├── Supabase Realtime (événements non autoritaires)
         └── workers planifiés / Edge Functions si nécessité démontrée

Administration CPC : routes /admin sécurisées séparément ;
projet web distinct possible après examen, non requis pour démarrer.
Services externes éventuels : EA et facturation Pro — interfaces abstraites,
aucune intégration supposée autorisée/configurée.
```

**Auth web** : utiliser les clients Supabase navigateur/serveur adaptés au SSR et le mécanisme de rafraîchissement recommandé pour la version Next.js retenue. À chaque Server Action/route sensible : confirmer l'utilisateur côté serveur et contrôler son autorisation métier ; ne jamais se fier uniquement à l'état UI ou au middleware/proxy. Cookies sécurisés, protections CSRF adaptées et redirections OAuth en liste blanche. Ne pas divulguer les jetons.

## 3. Arborescence de travail proposée

```text
cpc-v2/
  app/
    (public)/                 # landing, informations légales, login
    (auth)/                   # connexion, callback, onboarding
    (app)/                    # shell 3 onglets
      home/
      explore/
      profile/
      clubs/[clubId]/
      live/[sessionId]/
      players/[playerId]/
      messages/
      notifications/
      settings/
    admin/                    # autorisation admin distincte
    api/                      # callbacks et routes justifiées
  components/
    ui/                       # primitives et accessibilité
    layout/                   # shell, navigation, header
  features/
    auth/ profiles/ clubs/ memberships/ recruitment/
    radar/ live/ lineup/ explorer/ ea/ messaging/
    notifications/ reviews/ safety/ pro/ admin/
  lib/
    supabase/                 # browser, server, admin (server-only)
    auth/ authorization/ validation/ observability/
  supabase/
    migrations/               # nouvelles migrations V2 uniquement
    tests/                    # pgTAP / rôles simulés
    seed.sql                  # uniquement faux jeux synthétiques
  tests/
    unit/ integration/ e2e/
  docs/
    PRODUCT_SPEC.md
    ARCHITECTURE.md
    ADR/
    SECURITY_MATRIX.md
    OPEN_DECISIONS.md
  .github/workflows/
```

Aucune obligation de recopier cette arborescence à la lettre. Les noms exacts de routes, primitives de données et packages doivent être gelés via ADR avant implémentation.

## 4. Modèle conceptuel de données — **pas du SQL approuvé**

| Domaine | Entités candidates | Invariants à imposer |
|---|---|---|
| Identité | `profiles`, `profile_positions`, `user_preferences` | profil rattaché à Auth UID ; données privées distinctes |
| Clubs | `clubs`, `club_memberships`, `ownership_transfers`, `membership_history` | un OWNER actif par club ; max 1 PRIMARY + 1 SECONDARY par membre |
| Recrutement | `club_applications`, `club_invitations` | une candidature active par couple joueur/club ; acceptations atomiques |
| Radar | `radar_sessions` | utilisateur seul maître de l'activation ; TTL contrôlé serveur |
| LIVE | `live_sessions`, `live_requests`, `live_invitations`, `live_participants` | une invitation active par joueur/session ; admission et expiration atomiques |
| Feuille | `lineup_assignments`, `lineup_events` | un poste = un occupant ; un participant = un poste max ; présent dans la session |
| Communication | `conversations`, `conversation_members`, `messages` | accès seulement aux membres et selon blocage |
| Avis | `reviews`, `review_eligibilities` | preuve serveur de présence sur feuille finalisée |
| EA | `ea_links`, `ea_stat_snapshots`, `ea_sync_jobs` | provenance, horodatage, vérification et absence explicite |
| Sécurité | `user_blocks`, `reports`, `moderation_cases`, `sanctions`, `appeals`, `audit_events` | admin séparé ; traçabilité ; blocage transversal |
| Produit | `notifications`, `notification_preferences`, `pro_entitlements`, `billing_events` | notification dédupliquée ; Pro autorisé serveur |

**Points de conception à trancher** : schéma `public` limité aux objets réellement exposés ; schéma privé pour secrets de flux, modération sensible, billing et jobs ; éviter les colonnes sensibles dans des tables librement lisibles ; vues en `security_invoker` si exposées. Ne pas considérer le nombre de tables V1 comme une cible de V2.

**Index/contraintes attendus (conception)** : unicité partielle pour statuts actifs ; clés étrangères et `ON DELETE` explicites ; index des expiration TTL, session/participant, club/membre et conversations ; contraintes métier critiques via transactions qui verrouillent les lignes concernées et valident le rôle courant. Ne pas compter uniquement sur les index partiels pour la limite inter-lignes PRIMARY/SECONDARY.

## 5. Autorisations / matrice RLS de départ

Légende : `S` lire selon politique, `W` écrire selon contrôle serveur, `—` refus, `A` accès administration justifié.

| Ressource | Anonyme | Joueur | Manager du club | OWNER du club | Admin CPC |
|---|---|---|---|---|---|
| Profil public CPC | — | S selon blocages | S selon blocages | S selon blocages | A encadré |
| Données privées du compte | — | S/W soi-même | S/W soi-même | S/W soi-même | A restreint |
| Club/roster | — | S selon visibilité | S + gestion du club | S + gestion du club | A encadré |
| Memberships/ownership | — | S propres / demande | gestion membre ordinaire du club | transfert / rôles club | A encadré |
| Radar | — | W soi-même, S filtrée | S filtrée hors session | S filtrée hors session | A encadré |
| Session LIVE/feuille | — | S si autorisé, actions participant | W manager club | W OWNER club | A encadré |
| Candidatures/invitations | — | propres | W dans club géré | W dans club possédé | A encadré |
| Conversations/messages | — | membres uniquement | membres uniquement | membres uniquement | A uniquement selon procédure |
| Avis | — | S agrégats autorisés, W si éligible | idem | idem | A modération |
| Signalements/sanctions | — | propre signalement/statut autorisé | idem | idem | A selon besoin |
| Pro entitlements | — | S propre, aucune auto-attribution | S propre | S propre | A contrôlé |

**RLS** : chaque table exposée doit avoir RLS + privilèges SQL explicitement revus. Les fonctions `SECURITY DEFINER` sont exceptionnelles : schéma non exposé autant que possible, `search_path` verrouillé, identité et autorisation vérifiées, privilège `EXECUTE` limité, tests anti-IDOR. Toute action d'administration vérifie un rôle serveur non contrôlable via `user_metadata`. Les contrôles sont effectués en profondeur, pas seulement au niveau du composant ou de la route.

**Jeux de tests obligatoires** : anonymous, user A, user B, manager club A, manager club B, OWNER club A, admin CPC, utilisateur bloqué, utilisateur sanctionné. Tester sélectivement SELECT/INSERT/UPDATE/DELETE/RPC et l'abus de paramètres UUID ; tests de concurrence non simulés uniquement en mémoire.

## 6. Transactions et concurrence prioritaires

1. **Acceptation club** : vérifier invitation/candidature valide + droits manager + affiliations ; si deux places, enregistrer demande de remplacement au joueur ; après consentement, effectuer remplacement SECONDARY et adhésion atomiquement ; conserver historique ; empêcher doublon.
2. **Inversion PRIMARY ↔ SECONDARY** : transaction unique, aucune phase visible avec deux PRIMARY ou deux SECONDARY ; rôle OWNER/Manager inchangé.
3. **Transfert OWNER** : demande d'un OWNER actuel → acceptation du successeur permanent → changement de propriétaire atomique et audité ; refus/expiration sans perte de contrôle.
4. **Entrée LIVE** : manager invite (préapprouvé) ou joueur demande (nécessite validation) ; vérifier session ACTIVE non expirée, blocages, capacité et conflit ; acceptation = participant au banc par défaut.
5. **Mutation terrain** : transaction avec verrou session/feuille, état de présence et révision de feuille ; placement/swap/retour banc atomiques ; conflit renvoie état canonique et code explicite.
6. **Expiration/fermeture LIVE** : état TERMINATED/EXPIRED unique, invitations/demandes neutralisées, sièges invalidés ; prolongation n'a d'effet que si session encore ouverte ; heure serveur obligatoire.
7. **COMBLER** : droit manager du club + entitlement Pro validé serveur au moment de l'action ; aucun recrutement automatique sans invitation individuelle.
8. **Avis vérifié** : autorisation basée sur feuille finalisée conservée, jamais sur présence LIVE seule ni statistiques EA.
9. **Modération** : journal append-only, séparation enquête/décision, idempotence des jobs, contestation et conservation proportionnée.

Chaque transition doit spécifier un identifiant idempotent, codes d'erreur stable (`FORBIDDEN`, `EXPIRED`, `CONFLICT`, `ALREADY_HANDLED`...), et un protocole de rattrapage client en cas de réseau interrompu.

## 7. Temps réel, échéances et résilience

- `radar_sessions.expires_at` et `live_sessions.expires_at` = temps **serveur**, pas horloge navigateur.
- Les requêtes masquent déjà les états expirés, même avant traitement du job de nettoyage ; le job serveur garantit transition persistée et notifications.
- Supabase Realtime signale une modification ; la lecture SQL autorisée retrouve l'état définitif. Sur reconnexion/réouverture : refetch, contrôle d'échéance et réconciliation.
- Pas d'« online » inféré du WebSocket ; présence effective et Radar sont des faits différents.
- Souscription aux seuls canaux autorisés ; couper proprement lors logout, changement de club, blocage ou droits révoqués.
- Journaux d'échecs d'événements, métriques des jobs expirants ; pas de promesse de livraison de notifications navigateur sans autorisation et support réels.

## 8. Intégration EA : isolation et prudence

- Interface `EAProvider` et stockage de snapshots documentés : `source`, `ea_title`, `platform`, `retrieved_at`, `status`, `data` validées.
- Avant code de production : vérifier source réellement permise, droits d'accès, stabilité des champs, limites de débit, statut de liaison de compte, identifiants utilisés.
- Profil : périodes affichées ; métriques dépendantes du poste uniquement si remontées par la source ; indisponibilité explicite.
- Aucun scraping non validé, aucune statistique reconstruite à partir de suppositions, aucun badge de vérification sans preuve.

## 9. Monétisation et sûreté

- `pro_entitlements` établi par un événement serveur authentifié d'un opérateur choisi après arbitrage.
- Rejet backend de COMBLER sans entitlement actif ; la présence d'un bouton désactivé n'est pas suffisante.
- Webhooks de facturation signés et idempotents, protection contre rejeu ; ne jamais donner directement au client le droit d'écrire son plan.
- Paiements réels et comptes marchands : **jamais initiés sans accord explicite du propriétaire**.

## 10. Gates de construction et publication web

| Gate | Preuve attendue | Décision |
|---|---|---|
| G0 — Contrat | Spécification produit revue, points bloquants du Lot 1 résolus | GO/HOLD |
| G1 — Isolation | Nouveau repo + Supabase + Vercel distincts ; config non liée à V1 ; secrets hors Git | GO/HOLD |
| G2 — Fondations | Login réel, 3 onglets, profils, typecheck, tests et démo web | GO/HOLD |
| G3 — Clubs | Tests multi-rôles/affiliations et transactions concurrents | GO/HOLD |
| G4 — LIVE | TTL, admissions, terrain, Realtime et races vérifiés | GO/HOLD |
| G5 — Safety | RLS/GRANT, blocages, modération, suppression compte | GO/HOLD |
| G6 — Release | E2E iPhone/Android navigateur + desktop, accessibilité, performance, privacy, support, audit secrets et production | GO/HOLD |

**Cible qualité proposée** : lint + types + build sans erreur ; aucune vulnérabilité critique/haute non maîtrisée ; couverture tests des invariants métier et de la matrice RLS ; aucun parcours clé avec faux succès ; suivi des erreurs. Ne pas annoncer taux de couverture/score ou performance sans mesure.

**Déploiements** : Vercel Preview sur environnement non productif ; production distincte et protégée. Protéger pages et APIs côté serveur. PWA optionnelle et contrôlée (ne pas mettre en cache données privées sensibles ou réponses auth).

## 11. Plan Claude Code — livrables par étapes

### Étape A — Avant tout code (autorisé uniquement en lecture/analyse)
1. Charger `CPC_V2_PRODUCT_SPEC.md` + ce document.
2. Produire `docs/ADR/0001-stack.md`, `docs/ADR/0002-auth-boundary.md`, `docs/ADR/0003-supabase-boundary.md`, `docs/OPEN_DECISIONS.md`.
3. Produire diagrammes de parcours, contrats d'entrée/sortie des mutations, SQL **proposé** (non exécuté), matrice RLS/table/operation, backlog par vertical slice.
4. Comparer à CPC V1 **en lecture seule**, sélectionner explicitement uniquement des enseignements réutilisables ; **aucun copier-coller automatique**.
5. Remettre une revue des risques et demandes de décision au propriétaire.

### Étape B — Après création des projets par le propriétaire et autorisation spécifique
1. Vérifier identité des projets, variables non sensibles et séparation avec V1.
2. Scaffold Next.js/TypeScript et CI dans **nouveau** dépôt seulement.
3. Migrations SQL V2 incrémentales, tests RLS avant accès web public.
4. Vertical slices Auth → Clubs/Affiliations → Radar/LIVE → Explorer/EA → Messagerie/Safety → Pro → QA.
5. Commettre par lot avec messages français, rapport de preuves, demander GO avant tout déploiement de production.

### Prompt de lancement Claude Code (analyse uniquement)

> **MISSION CPC V2 — PHASE 2 / CONCEPTION SANS ÉCRITURE.** Tu es lead engineer de CPC V2, nouvelle application web mobile-first. Références obligatoires : `CPC_V2_PRODUCT_SPEC.md` et `CPC_V2_ARCHITECTURE_PHASE2.md`. Respecte la hiérarchie `[V]` validé / `[P]` proposition / `[O]` ouvert. N'accède à l'ancien repo CPC et ancien Supabase que pour lecture, sans utiliser leurs secrets, données ou URLs dans la V2. Aucun nouveau projet ni branche ne doit être créé par toi à ce stade ; aucun fichier existant, GitHub, Supabase ou Vercel modifié ; aucun déploiement. Livre une revue de l'architecture proposée, un catalogue de mutations atomiques, une matrice RLS complète par table/opération/rôle, les ADR et la liste courte de décisions bloquantes du Lot 1. Ne déclenche pas les étapes de développement sans nouveau GO explicite.

## 12. Décisions ouvertes et recommandations par défaut (non validées)

| ID | Question | Proposition temporaire, non validée | Impact |
|---|---|---|---|
| D-01 | Joueur affilié mais hors session peut-il être recruté via Radar ? | Oui s'il active volontairement Radar et n'est pas dans une session | Explorer / Radar |
| D-02 | Sessions simultanées d'un joueur | Au plus une participation LIVE active | LIVE |
| D-03 | Prolongation répétée et plafond durée | Autoriser seulement prolongation explicite, plafond à décider | LIVE |
| D-04 | Vérification identité EA et source stats | Bloquer les badges EA « vérifié » tant que preuve non définie | EA |
| D-05 | Auth OAuth providers | Activer un fournisseur seulement après configuration validée | Auth |
| D-06 | Politique rétention/suppression/dissolution | Politique légale et produit avant données réelles | Safety |
| D-07 | Prestataire et prix Pro | Pas de paiement réel tant que prestataire et conditions non approuvés | Pro |
| D-08 | PWA/Web Push | Installation optionnelle ; centre de notifications in-app fiable | UX |
| D-09 | Modération et seuils sanctions | Revue humaine, sanctions tracées, procédure d'appel définie avant lancement | Safety |
| D-10 | Volumétrie/SLO/cibles performance | Fixer des budgets sur mesures préproduction | Qualité |

## 13. Conditions de clôture de Phase 2

**Phase 2 prête pour validation** quand : architecture cohérente avec exigences, choix techniques ADR écrits, contrats des mutations et matrice RLS passés en revue, points ouverts explicités. **Pas de GO développement par défaut.**

---
*Document de conception ; pas de code exécuté, aucune table Supabase créée, aucune configuration Vercel changée.*
