# CPC V2 — PRODUCT SPECIFICATION

**Version :** 1.0 — 25 octobre 2026  
**Statut :** référence fonctionnelle de travail ; implémentation non autorisée par ce document seul  
**Produit :** CPC / ClubPro Connect — application web EA FC Clubs  
**Destinataire :** Claude Code  
**Stratégie :** clean rebuild sans migration de données V1

## 0. Hiérarchie des sources et règles de collaboration

1. **Décisions du 25/10/2026, postérieures au cahier UX** : CPC V2 est une **web app mobile-first**, pas une application Expo ; nouveau dépôt, nouveau Supabase, nouveau Vercel ; aucune migration des données ou du schéma V1 ; Radar ne montre comme disponibles que les joueurs LIVE hors session ; **AUTOFILL gratuit**, **COMBLER Pro** ; absence de données EA = état explicite « Données indisponibles ».
2. **CPC_Cahier_UX_V1_Reference.docx** (25/10/2026) : source de vérité pour les parcours, interfaces et règles métier non contredites par (1).
3. **MASTER PLAN RELEASE CPC** (30/09/2026) : source d'exigences utiles pour sécurité, qualité, modération et publication. **Ses gates spécifiques Expo, builds natifs, TestFlight, App Store et Google Play ne s'appliquent pas à la V2 web.**
4. **Ancien dépôt GitHub `selimkh31-glitch/CPC` et ancien Supabase `cfgvtyxiggewauevvigm`** : référence technique **en lecture seule**, jamais source d'obligation si en conflit avec (1) ou (2).

**Étiquettes** : `[V]` décision produit validée ; `[P]` proposition d'implémentation à confirmer ; `[O]` question ouverte bloquant la fonction concernée. Ne jamais transformer `[P]` ou `[O]` en décision tacite.

**Interdictions absolues :** modifier, supprimer, migrer, redéployer ou réutiliser les secrets de CPC V1 ; pointer une V2 vers l'ancien Supabase ; réutiliser des données utilisateurs réelles sans autorisation ; mélanger avec d'autres projets ; déclarer des contrôles PASS sans exécution.

## 1. Vision et périmètre

**[V]** CPC connecte joueurs et clubs EA FC Clubs pour **trouver une occasion de jouer, trouver/recruter des joueurs, gérer une session LIVE**. Application web responsive, priorité tactile/mobile, exploitable aussi sur ordinateur.

**[V]** Un compte joueur unique. OWNER ou Manager est un joueur bénéficiant de permissions additionnelles pour un ou plusieurs clubs, **sans bascule d'application**.

**[V]** Trois onglets persistants : **Accueil / Explorer / Profil**. Messages et notifications s'ouvrent depuis l'en-tête et les contextes. Club, terrain, conversations, gestion peuvent avoir des pages dédiées. Détails courts en sheet/panneau, sans empiler plusieurs sheets. Retour = filtres/scroll conservés.

**[V]** Une action dominante par écran, deux ou trois informations secondaires. Aucun état fictif, faux succès, score EA inventé, disponibilité supposée ou avis non vérifié marqué vérifié.

**Hors lancement V1 [V]** : ligues, compétitions, tournois, fonctionnalités secondaires sans rapport avec le recrutement et les sessions ; anciens écrans à double mode PLAYER/CLUB.

**[P]** Une PWA installable avec manifest, icônes et stratégie de cache conservatrice, sans présumer que les push web sont disponibles sur tous les navigateurs.

## 2. Personas et permissions

- **Joueur** : profil, affiliations, Radar, candidatures, invitations, messages, exploration et participation LIVE.
- **Manager d'un club** : droits joueur + recrutement, invitations, LIVE, feuille de session, membres ordinaires et présentation du club **dans ce club uniquement**.
- **OWNER d'un club** : droits manager + nomination/rétrogradation des managers et transfert de propriété ; OWNER protégé contre l'exclusion par un manager.
- **Modérateur/Admin CPC** : environnement d'administration distinct, accès privilèges minimaux, audit et contrôles vérifiables ; ne pas confondre « manager de club » avec « admin CPC ».

**[V]** Toutes les permissions réelles sont vérifiées côté serveur. Le masquage d'un CTA n'est jamais une mesure de sécurité suffisante. Les droits sont réévalués lors de chaque mutation, notamment après changement de rôle ou club actif.

## 3. Architecture de l'information

**Tabs persistants** :
- `/` ou `/home` : Accueil contextuel.
- `/explore` : sous-intentions **Jouer / Clubs / Joueurs** (Joueurs visible uniquement aux managers autorisés).
- `/profile` : profil personnel, Mes invitations, Mes clubs et paramètres.

**Destinations contextuelles** : `/club/[id]`, `/club/[id]/manage`, `/live/[sessionId]`, `/players/[id]`, `/messages`, `/messages/[id]`, `/notifications`, `/settings`, `/settings/account`, `/auth/*`, `/onboarding`.

**[P]** Les chemins exacts sont un exemple de structure, non un contrat produit. Claude Code doit fixer une convention unique et documentée, et isoler l'administration CPC du public.

## 4. Exigences fonctionnelles (traçabilité)

### AUTH — Authentification et onboarding

- **AUTH-01 [V]** Inscription/connexion et persistance de session, déconnexion, vérification de l'adresse email ; parcours de récupération de compte.
- **AUTH-02 [V]** Fournisseurs email, Google et Apple issus du périmètre initial, à intégrer selon configuration et faisabilité sur web ; ne pas simuler des boutons actifs si un fournisseur n'est pas configuré.
- **AUTH-03 [V]** Profil joueur complet après onboarding : pseudo, plateforme, postes et informations nécessaires. Réduire les données personnelles au minimum et traiter l'âge avec précaution.
- **AUTH-04 [V]** Suppression de compte initiable depuis les paramètres ; authentification récente pour les opérations sensibles ; suppression/anonymisation/rétention selon politique validée.
- **AUTH-05 [V]** Chaque tentative d'accès à une page privée renvoie vers la connexion et permet ensuite de revenir au contexte autorisé ; aucun écran admin accessible par erreur à l'ouverture.

### ACC — Accueil contextuel

- **ACC-01 [V]** Priorité d'affichage stricte : (1) session LIVE du joueur ; (2) invitation LIVE urgente ; (3) LIVE de son club/action manager urgente ; (4) explorer ou allumer le Radar. Une seule action principale.
- **ACC-02 [V]** Sans session : club actif si affilié, Radar réel, suggestions contextuelles véridiques ; gérer compte neuf, zéro club, zéro donnée, hors ligne.
- **ACC-03 [V]** Avec session : club, participants, temps restant calculé depuis l'échéance serveur, accès terrain, quitter session et messages.
- **ACC-04 [V]** Ne pas afficher deux fois la même urgence sur l'écran et dans une notification contextuelle.

### RAD — Radar LIVE

- **RAD-01 [V]** Activation exclusivement volontaire. Durées proposées : 30, 60, 120 min ; défaut 120. Aucun « LIVE » activé par l'ouverture de la page, reconnexion ou suggestion.
- **RAD-02 [V]** Indicateur persistant dans l'en-tête, statut et temps restant synchronisés serveur ; expiration automatique ; distinguer Radar, présence session et simple présence réseau.
- **RAD-03 [V]** Dans Explorer Joueurs, seuls les joueurs réellement LIVE **et hors session** peuvent être présentés comme disponibles.
- **RAD-04 [V]** Recherche/alerte enregistrée facultative, opt-in, ne déclenchant jamais automatiquement le Radar.
- **RAD-05 [O]** Préciser visibilité des joueurs LIVE affiliés mais hors session et règles anti-abus (renouvellement, cadence).

### EXP — Explorer

- **EXP-01 [V]** Trois sous-intentions distinctes : Jouer (opportunités), Clubs (adhésion), Joueurs (manager autorisé). Filtres et scroll indépendants par sous-intention.
- **EXP-02 [V]** Deux à trois filtres fréquents visibles, filtres supplémentaires en panneau et chips effaçables ; zéro résultat expliqué ; pas de données inventées.
- **EXP-03 [V]** Jouer : sessions ouvertes réelles, expiration/capacité vérifiées, demande d'accès LIVE et alerte facultative.
- **EXP-04 [V]** Clubs : cartes compactes identité, langue, niveau déclaré, recrutement et postes recherchés ; fiche, candidature, états fermé/déjà membre/déjà candidat/deux affiliations.
- **EXP-05 [V]** Joueurs : pseudo, poste, LIVE attesté et EA si disponible ; profil, invitation LIVE ou club selon permission ; blocages respectés.

### APP — Candidatures et adhésion

- **APP-01 [V]** Une candidature active par joueur et club ; message facultatif ; **Discuter** conserve « En attente ».
- **APP-02 [V]** Accepter/refuser de façon atomique et idempotente, droits manager vérifiés sur club ciblé.
- **APP-03 [V]** Si les deux affiliations sont utilisées, demander au joueur concerné confirmation du remplacement du SECONDARY **avant** adhésion définitive. Aucune perte d'historique.
- **APP-04 [V]** Invitation ponctuelle LIVE n'implique jamais une adhésion permanente.

### LIV — Session LIVE / Match Manager

- **LIV-01 [V]** Session de club distincte du Radar joueur et de l'affiliation ; état et TTL appartenant au serveur.
- **LIV-02 [V]** Une demande spontanée requiert validation manager. Une invitation manager est préapprouvée : son acceptation donne accès à la session (sans seconde approbation) mais ne garantit pas une place titulaire.
- **LIV-03 [V]** Un participant non affecté est au banc. Aucun joueur non admis/absent de la session sur la feuille. Terrain par poste, banc sous les titulaires, halo LIVE néon perceptible et modéré.
- **LIV-04 [V]** Interaction tactile : sélectionner joueur du banc puis poste libre ; sur poste occupé, swap explicite et confirmé ; retirer du terrain renvoie au banc ; concurrence entre deux managers traitée côté serveur.
- **LIV-05 [V]** **AUTOFILL gratuit** : répartit exclusivement des participants admis et présents, sans solliciter de joueurs externes.
- **LIV-06 [V]** **COMBLER Pro** : propose des candidats externes, puis invitations individuelles ; contrôle d'abonnement **côté serveur**, jamais seulement via UI.
- **LIV-07 [V]** Demandes spontanées dans une file discrète avec compteur et acceptation/refus individuels. Une invitation LIVE active maximum par joueur/session ; états attente, acceptée, refusée, expirée, annulée ; annulation avant acceptation seulement.
- **LIV-08 [V]** Départ joueur immédiat une fois confirmé serveur, libère poste et met à jour les autres ; ne change ni affiliation ni Radar automatiquement.
- **LIV-09 [V]** Fermeture manager avec confirmation et nombre de participants ; clôture la session et invalide demandes/invitations ; historique authentique conservé.
- **LIV-10 [V]** Expiration automatique à l'échéance ; prolongation manager par 30/60/120 min avec confirmation serveur et gestion des races.
- **LIV-11 [O]** Déterminer cadence/rappels de fin, limites anti-abus, limite de sessions parallèles et règles exactes de présence technique (reconnexion/onglet fermé).

### PRO — Profils, statistiques EA et réputation

- **PRO-01 [V]** Profil personnel/tiers accessible seulement aux comptes authentifiés selon protections : identité, avatar, postes, affiliations, LIVE, stats EA, réputation, historique véritable.
- **PRO-02 [V]** Statistiques adaptées au poste principal **uniquement si réellement disponibles**, vue complète, provenance/période et état « Données indisponibles » ; aucune métrique construite ou saisie à la main.
- **PRO-03 [V]** Réputation par esprit d'équipe, communication, fair-play, agrégats autorisés ; commentaires sensibles privés/modérés, aucun score artificiel ni pénalité pour absence de vocal.
- **PRO-04 [V]** Badge « vérifié » uniquement après éligibilité serveur fondée sur présence dans une feuille finalisée ; une session CPC ne prouve pas qu'un match EA a été joué.
- **PRO-05 [V]** Édition par panneaux courts (identité, postes, présentation), enregistrements séparés, refus d'édition clairement affiché.
- **PRO-06 [O]** Préciser API EA disponible, droits d'utilisation, liaison d'identité, champs par position, cadence/limites de synchronisation.

### CLB — Affiliations et club

- **CLB-01 [V]** Au plus 1 affiliation PRIMARY et 1 SECONDARY ; inversion atomique et explicite, sans changement des rôles OWNER/Manager ni perte d'historique.
- **CLB-02 [V]** Troisième club : remplacement explicite du SECONDARY après consentement ; changer de club actif d'interface ne modifie pas PRIMARY.
- **CLB-03 [V]** Départ d'un club ordinaire immédiat après validation serveur, sans autorisation manager ; conserver l'historique conforme.
- **CLB-04 [V]** Fiche club : identité, niveau/langue déclarés, recrutement, postes recherchés, effectif et LIVE réels ; « Gérer le club » seulement pour personnes habilitées.
- **CLB-05 [V]** Effectif groupé Gardiens / Défenseurs / Milieux / Attaquants, chaque membre une fois, rôle affiché ; vue membre contextuelle.
- **CLB-06 [V]** Gestion club : candidatures, invitations, membres, recrutement, paramètres, LIVE ; droits vérifiés par club.
- **CLB-07 [V]** OWNER seul peut nommer/rétrograder managers ; transfert de propriété avec proposition et acceptation explicite du successeur déjà membre. Ancien OWNER reste OWNER tant que transfert non accepté et validé ; après transfert membre ordinaire.
- **CLB-08 [V]** OWNER d'un club avec d'autres membres ne peut pas partir sans transfert accepté. Manager ne peut exclure OWNER ou s'octroyer des droits ; audit des mutations sensibles.
- **CLB-09 [O]** Dissolution club solo OWNER, sort des messages/statistiques/historiques et politique de rétention.

### INV — Invitations permanentes au club

- **INV-01 [V]** Manager peut inviter depuis profil ou Explorer en sélectionnant **un club qu'il gère** ; joueur accepte/refuse explicitement.
- **INV-02 [V]** `Profil > Mes invitations` sépare En attente / Historique ; espace gestion club montre invitations envoyées et leurs statuts.
- **INV-03 [V]** Invitation annulée/expirée/déjà traitée non actionnable ; pas de doublon actif, annulation avant acceptation ; acceptation atomique avec gestion des deux affiliations.
- **INV-04 [V]** Distinguer structurellement invitations LIVE et invitations d'adhésion.

### MSG / NOT — Messages et notifications

- **MSG-01 [V]** Messagerie contextuelle depuis en-tête, profils, candidatures, invitations et sessions. Aucun onglet Messages permanent.
- **MSG-02 [V]** Contrôles d'accès à chaque conversation/message, blocages appliqués, pagination, pending, erreurs, déduplication et traitement de l'édition/modération.
- **NOT-01 [V]** Centre de notifications priorisant LIVE urgent, décisions importantes puis autres ; lecture, historique, expiration et CTA invalides désactivés.
- **NOT-02 [V]** Préférences et consentements ; ne pas supposer que les notifications push sont disponibles sur tous les navigateurs.

### SAF — Trust & Safety et conformité web

- **SAF-01 [V]** Signaler joueur, club, message ou avis ; bloquer/débloquer ; blocage sans contournement dans découverte, invitations, messagerie et notifications.
- **SAF-02 [V]** Pipeline modération administrable : réception, traçabilité, instruction, décision, sanctions, recours et protections d'accès ; cas d'usage explicitement testés.
- **SAF-03 [V]** Suppression de compte accessible, pages confidentialité/conditions/support, politique de conservation, traitement des données personnelles et droits utilisateurs.
- **SAF-04 [V]** Pas de texte sensible public par défaut ; ne jamais exposer jetons, service-role, secrets d'intégration, dossiers de modération via l'interface web.
- **SAF-05 [O]** Fixer textes de politique, seuils de sanction, rétention, procédure de recours et processus de réponse.

## 5. Expérience et robustesse transverses

- **UX-01 [V]** États distincts loading/skeleton, vide, erreur, timeout, hors ligne, refus permission, expiration, conflit concurrent, suppression/blocage.
- **UX-02 [V]** Une mutation n'affiche une réussite qu'après confirmation serveur ; actions à risque idempotentes, bouton pending, retry contrôlé.
- **UX-03 [V]** Touch targets lisibles, focus clavier, lecteurs d'écran, contrastes, réglage réduire les animations, gestion clavier mobile, petits écrans.
- **UX-04 [V]** Micro-interactions sobres, terrain LIVE lisible, aucune boucle d'animation coûteuse ou « effet premium » au détriment de l'usage.
- **UX-05 [P]** Objectifs de performance à chiffrer lors de Phase 2 ; instrumentation erreurs métier/frontend avant mise en production.

## 6. Architecture cible : hypothèses à confirmer en Phase 2

**[P]** Next.js (App Router), TypeScript strict, Tailwind, composants accessibles et tokens design ; **[P]** architecture par domaines, séparation UI/hooks/services/contrats ; **[P]** Supabase neuf pour Auth, Postgres, RLS, Realtime et tâches serveur ; **[P]** Vercel neuf pour hébergement ; **[P]** gestion des mutations métier critiques via fonctions/RPC transactionnelles avec checks d'identité et d'autorisation.

**Ne pas décider prématurément** : bibliothèque de composants, state manager, ORMs, fournisseur emails/push, paiement Pro, synchronisation EA, fréquence cron, stratégie PWA offline. Toute décision devra être documentée (ADR), évaluée contre les besoins et les dépendances actuelles.

## 7. Données V2 : reconstruction à neuf, sans migration

**[V]** Aucun import des 10 comptes, clubs, messages, historiques ou autres données CPC V1 comme étape normale de reconstruction. Si besoin de données QA : jeux **entièrement synthétiques**, clairement identifiés et isolés.

**[P]** Concevoir de zéro des domaines conceptuels : accounts/profiles, clubs, memberships, roles/ownership_transfers, radar_sessions, club_live_sessions, live_participations, lineup_assignments, applications, club_invitations, live_invitations/requests, conversations/messages, notifications, reviews/eligibilities, blocks/reports/moderation, ea_links/snapshots, subscriptions/entitlements. **Ce n'est pas un schéma SQL approuvé.**

**[V]** L'ancien code/schema peut être lu pour retrouver des règles, edge cases et tests pertinents ; aucun clonage intégral, aucune dépendance au projet V1, aucune copie de secrets. Chaque fonctionnalité doit disposer d'une matrice RLS et d'un modèle de menace.

## 8. Tests d'acceptation prioritaires

| ID | Scénario | Résultat attendu |
|---|---|---|
| T-01 | Joueur nouveau, sans club, explore et candidate | Candidature unique, statuts cohérents |
| T-02 | Joueur avec PRIMARY + SECONDARY accepte une nouvelle invitation | Consentement remplacement secondaire, transition atomique |
| T-03 | Manager invite joueur LIVE, joueur accepte | Admission directe et banc, sans affiliation |
| T-04 | Joueur demande spontanément l'accès LIVE | Pas d'admission sans décision manager |
| T-05 | Deux managers déplacent le même joueur simultanément | Une seule mutation cohérente, conflit explicite |
| T-06 | Invitation acceptée au moment de l'expiration de session | Aucune session réactivée / participation fantôme |
| T-07 | Manager prolonge à l'échéance ; réseau coupe | État serveur autoritaire, aucun faux succès |
| T-08 | Manager clôt une session peuplée | Présences closes, demandes/invitations invalidées |
| T-09 | OWNER propose transfert, candidat refuse puis autre accepte | Propriété unique, transfert atomique et tracé |
| T-10 | Manager tente escalade rôle / exclusion OWNER / autre club par API | Rejet serveur et données inchangées |
| T-11 | Utilisateur bloque un autre | Invisible/inaccessible dans recherches, invitations et messages selon politique |
| T-12 | Aucune statistique EA récupérable | « Données indisponibles », aucune valeur fictive |
| T-13 | Avis sans feuille finalisée | Rejet de l'attribut « vérifié » |
| T-14 | Accès anonyme à `/messages` et accès non admin à l'administration | Refus/redirect, aucune fuite |
| T-15 | COMBLER sans entitlement Pro | Rejet serveur, pas seulement blocage UI |
| T-16 | Radar actif mais joueur entre en session | Non montré comme disponible dans Explorer Joueurs |
| T-17 | Small viewport, clavier, lecteurs d'écran, reduced motion | Parcours utilisables et accessibles |
| T-18 | Compte supprimé / token périmé / permissions révoquées | Aucune action privilégiée autorisée |

Tests requis : unitaires des règles, intégration DB/RLS avec rôles réels simulés, tests E2E navigateur mobile et desktop, races/transactions, contrôle de configuration production, scan secrets/dépendances, tests modération, performance et accessibilité. Ne pas annoncer « PASS » sans les exécuter.

## 9. Découpage en lots d'implémentation (aucune exécution encore)

- **Lot 0 — Préparation** : figer la spec, résoudre les `[O]` bloquants, approbation de l'architecture, dépôt V2 et projets neufs créés par le propriétaire.
- **Lot 1 — Fondations** : configuration repo, CI, auth, modèles utilisateurs, design system, navigation 3 tabs, pages états.
- **Lot 2 — Clubs** : profils clubs, affiliations, rôles, gouvernance, candidatures et invitations permanentes.
- **Lot 3 — LIVE** : Radar, sessions, admissions, invitations/demandes et moteur terrain/banc.
- **Lot 4 — Explorer & EA** : recherches par intention, états réels, intégration EA vérifiée et disponibilité.
- **Lot 5 — Social & Safety** : messagerie, notifications, avis vérifiés, signalement/blocage, admin de modération et suppression compte.
- **Lot 6 — Monétisation** : entitlement Pro pour COMBLER, intégration paiement décidée séparément et testée.
- **Lot 7 — Release Web** : tests E2E, QA iPhone/Android navigateur et desktop, audit RLS, sécurité, privacy/support, observabilité et go/no-go.

**Gates de chaque lot :** typecheck + lint + tests pertinents + démonstration réelle + matrice RLS si mutations + audit nouveaux secrets + journal de décisions + rapport succinct. Aucun lot ne part en production automatiquement.

## 10. Points ouverts à arbitrer avant le lot concerné

1. **[O]** Affiliation et Radar : peut-on être proposé si affilié à un club mais LIVE hors session ? Conditions exactes de recrutement.
2. **[O]** Sessions : limite parallèle par joueur/club, preuve de présence (onglet fermé), rappels à échéance, limite et calcul de prolongations.
3. **[O]** EA : source technique et contractuelle autorisée, champs disponibles par poste, rythme, preuve de liaison du pseudo, limites d'API.
4. **[O]** Gouvernance : dissolution, suppression vs anonymisation d'historique, politique de rétention.
5. **[O]** Abonnement Pro : opérateur de paiement, tarif, essai, remboursement, absence/défaillance webhook, admin des entitlements.
6. **[O]** Modération : politique des sanctions, délais de recours, visibilité des commentaires, traitement des notifications sensibles.
7. **[O]** Auth web : domaines de redirection OAuth Google/Apple et exigences exactes de vérification d'âge.
8. **[O]** Statut PWA installable et canal notifications (in-app certain, Web Push sous conditions).
9. **[O]** Niveaux de service, seuils de performance et volumes attendus ; cible de lancement et langage marketing.

Les anciens points ouverts qui ne concernent que la compatibilité avec le schéma V1 ou les stores natifs ne bloquent **pas** la création de la V2 : elle a un nouveau schéma et une release web.

## 11. Critères GO/HOLD de la Phase 1

**GO vers architecture technique, pas vers déploiement**, quand :
- le propriétaire valide la version de cette spec et les exclusions ;
- chaque décision ouverte impactant le Lot 1 possède une valeur confirmée ou une stratégie temporaire clairement étiquetée ;
- le cahier UX est converti en backlog testable avec responsables et preuves de conformité ;
- le nouveau projet et son isolement de V1 sont documentés.

**HOLD développement** si Claude Code doit inventer une règle métier sensible, brancher une V2 sur V1, exposer un secret, contourner la RLS ou fournir de fausses métriques EA.

## 12. Mission initiale à confier à Claude Code

> Tu es le lead engineer de CPC V2, une nouvelle web app EA FC Clubs. Lis d'abord ce fichier intégralement. N'écris aucun code et ne crée aucun projet pour l'instant. Produis `ARCHITECTURE_PROPOSAL.md` (architecture modules, routes, modèle de données conceptuel, matrice de permissions/RLS, services temps réel et transactions), `ADR_INDEX.md`, `BACKLOG_V2.md` (lots, dépendances et critères d'acceptation) et `OPEN_DECISIONS.md` (points bloquants et options). Inspecte CPC V1 seulement en lecture seule si accessible, sans copier ses secrets ni ses données. Ne migre rien ; n'utilise que les nouveaux projets Supabase et Vercel après que le propriétaire les aura créés. Aucune modification Git, SQL, configuration ou déploiement avant une nouvelle autorisation explicite.

---
**Fin de CPC_V2_PRODUCT_SPEC.md v1.0**
