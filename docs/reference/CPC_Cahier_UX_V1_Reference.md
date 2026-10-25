CPC / CLUBPRO CONNECT

CAHIER UX V1 — RÉFÉRENTIEL DE CONCEPTION

Version originale : 1.0 — 25 octobre 2026
Document source : CPC_Cahier_UX_V1_Reference.docx
Statut : Référence de conception UX
Projet destinataire : CPC V2 — Clean Rebuild
Portée originale : Application mobile iOS puis Android, rôles Joueur, Manager, OWNER, EA FC Clubs.

Note de compatibilité CPC V2 : ce cahier est conservé comme référence UX. Les décisions validées ultérieurement dans CPC_V2_PRODUCT_SPEC.md et le registre consolidé des décisions prévalent. CPC V2 est une application web responsive, mobile-first. Aucun code ou environnement V1 ne doit être modifié.

⸻

0. Statut et méthode de lecture

Ce document formalise les décisions produit prises dans l’atelier UX CPC.

Il décrit l’expérience cible et les critères de validation, pas l’état constaté du dépôt ni de Supabase. Les exemples de clubs, de chiffres et de joueurs sont illustratifs.

Trois niveaux de certitude :

* [VALIDÉ] Décision UX prise.
* [À VÉRIFIER] Dépendance technique ou règle existante à confronter au code.
* [À ARBITRER] Détail non tranché.

Ne jamais présenter une intention UX comme une fonctionnalité déjà livrée.

Relation avec le MASTER PLAN RELEASE CPC du 30 septembre 2026 : ce plan était la référence initiale de sécurité, QA, publication et gel.

Plusieurs choix de cet atelier, notamment la navigation unifiée, l’absence d’onglet Messages et le parcours manager contextuel, modifient le périmètre initial.

Pour CPC V2, les exigences de sécurité et de QA restent pertinentes, tandis que les contraintes de publication natives sont remplacées par des exigences web.

⸻

1. Principes non négociables

* Une seule application contextuelle : pas de bascule structurelle Joueur/Club. Le manager reste joueur.
* Trois onglets persistants : Accueil, Explorer, Profil.
* Messagerie et notifications accessibles par l’en-tête et les contextes.
* Une action principale par écran et deux ou trois informations secondaires pertinentes.
* Aucun tableau de bord surchargé.
* Données véridiques : statistiques EA uniquement si récupérées.
* Avis vérifiés uniquement sur preuve d’éligibilité.
* Aucun score artificiel ni heatmap estimée.
* LIVE volontaire, limité dans le temps et synchronisé serveur.
* Ne pas confondre membre permanent et invité ponctuel.
* Actions partagées confirmées serveur.
* Aucun succès fictif.
* Traitement explicite des conflits et erreurs.
* Confidentialité et sécurité : profils accessibles aux membres authentifiés, blocages appliqués, permissions vérifiées côté serveur.
* Accessibilité et gestes découvrables.
* Réduction des animations.
* Prise en compte de la latence et du réseau dégradé.

⸻

2. Architecture de l’information et navigation

Destination	Accès	Rôle
Accueil	Onglet 1	Session courante, invitations LIVE urgentes, club actif, Radar contextuel
Explorer	Onglet 2	Jouer / Clubs / Joueurs, ce dernier réservé aux managers
Profil	Onglet 3	Identité, statistiques, réputation, affiliations, invitations, paramètres
Messages	En-tête, fiches, notifications	Conversations contextualisées, sans onglet permanent
Notifications	En-tête	Centre unifié, priorisation, états et historique
Espace Club	Sélecteur, fiches, Profil	Identité, effectif, gestion selon rôle
Feuille LIVE	Accueil, session, invitation acceptée	Terrain, banc et outils manager contextualisés

Principes de navigation

* Panneau inférieur pour les détails rapides : joueur, club, invitation, candidature.
* Page dédiée pour le profil complet, le terrain LIVE, les conversations et la gestion Club.
* Ne jamais empiler plusieurs panneaux.
* Préserver les filtres et la position de scroll au retour.

⸻

3. Accueil contextuel

Ordre de priorité [VALIDÉ] :

1. Session LIVE en cours.
2. Invitation LIVE urgente.
3. Session de son club ou action manager urgente.
4. Explorer / activation Radar.

Une seule action dominante, avec deux ou trois blocs secondaires.

Ne pas dupliquer les notifications lorsque l’utilisateur consulte déjà le contexte correspondant.

ACC-01 — Accueil sans session

Objectif : orienter vers une activité réelle.

Contenu :

* Club actif si affilié.
* Statut Radar.
* Suggestions contextualisées.
* Notification urgente éventuelle.

Actions :

* Explorer.
* Allumer le Radar avec confirmation.
* Ouvrir un club.

États à couvrir :

* Nouveau compte.
* Aucun club.
* Aucune donnée.
* Radar éteint.
* Hors ligne.

ACC-02 — Accueil en session

Objectif : rejoindre rapidement le terrain.

Contenu :

* Club.
* Participants.
* Temps restant.
* État LIVE réel.

Actions :

* Ouvrir la feuille.
* Quitter la session.
* Consulter les messages.

États à couvrir :

* Session expirée.
* Fermeture par manager.
* Perte réseau.
* Réconciliation du temps serveur.

⸻

4. Radar et disponibilité LIVE

[VALIDÉ]

L’activation du Radar est exclusivement explicite.

Durées proposées :

* 30 minutes.
* 60 minutes.
* 120 minutes, durée par défaut.

Une proposition contextuelle est possible, mais ne déclenche jamais une activation automatique.

Une pastille persistante dans l’en-tête indique l’état et le temps restant.

Le CTA dominant n’apparaît que lorsqu’aucune urgence supérieure n’existe.

Les notifications liées à une recherche enregistrée sont facultatives et ne doivent jamais activer automatiquement le Radar.

Distinctions essentielles

Ne pas confondre :

* Radar joueur.
* Présence dans une session.
* État en ligne technique.

Les libellés et filtres doivent refléter les données réellement disponibles.

Précision CPC V2 validée ultérieurement : un joueur LIVE déjà engagé dans une session n’est pas présenté comme disponible dans Explorer Joueurs.

⸻

5. Explorer et recrutement

Explorer comporte trois intentions distinctes :

* Jouer : sessions et opportunités pertinentes.
* Clubs : recherche de club.
* Joueurs : recherche de joueurs, réservée aux managers habilités.

Chaque intention conserve indépendamment ses filtres et sa position de scroll.

Deux à trois filtres fréquents restent visibles. Les autres sont accessibles dans un panneau, avec des chips effaçables.

Aucun résultat fictif ni profil affiché comme disponible sans preuve.

EXP-01 — Explorer Jouer

Objectif : trouver une occasion de jouer.

Contenu :

* Cartes de sessions ou clubs.
* Informations réelles.
* État et contexte.

Actions :

* Ouvrir une fiche.
* Demander accès LIVE.
* Configurer une alerte facultative.

États :

* Aucun résultat.
* Session complète ou expirée.
* Candidature en cours.

EXP-02 — Explorer Clubs

Objectif : découvrir et rejoindre durablement un club.

Contenu des cartes :

* Identité.
* Langue.
* Niveau déclaré.
* Recrutement.
* Postes recherchés.

Actions :

* Fiche rapide.
* Profil Club.
* Candidature avec message facultatif.

États :

* Recrutement fermé.
* Déjà membre.
* Candidature active.
* Deux affiliations occupées.

EXP-03 — Explorer Joueurs (manager)

Objectif : trouver des joueurs disponibles et pertinents.

Contenu des cartes :

* Pseudo.
* Poste.
* LIVE attesté.
* Statistiques EA disponibles.

Actions :

* Ouvrir le profil.
* Inviter LIVE.
* Inviter dans un club autorisé.

États :

* Joueur non LIVE.
* Blocage.
* Invitation déjà active.
* Indisponibilité.

Candidatures

[VALIDÉ]

* Une candidature active par joueur et club.
* Message facultatif.
* Statut « En attente » pendant une discussion.
* Accepter ou refuser sans workflow RH complexe.
* Une invitation ponctuelle à une session n’entraîne aucune affiliation permanente.

⸻

6. Sessions LIVE et Match Manager

La session LIVE est distincte de l’adhésion au club.

Les joueurs admis apparaissent sur le terrain ou sur le banc.

Aucun joueur absent de la session ne peut apparaître sur la feuille.

Le terrain est central, avec le banc sous les titulaires.

Le halo néon LIVE doit être perceptible sans animation envahissante.

LIV-01 — Terrain et banc

Objectif : voir et organiser les joueurs présents.

Contenu :

* Terrain par postes.
* Joueurs titulaires.
* Banc.
* Statut LIVE.
* Temps restant.

Interactions :

* Sélectionner un joueur du banc.
* Sélectionner un poste libre.
* Sur un poste occupé, demander un swap explicite.
* Retirer un joueur du terrain le renvoie au banc.

États :

* Aucun joueur.
* Poste occupé.
* Conflit d’affectation.
* Joueur parti.
* Réconciliation temps réel.

LIV-02 — Gérer la session

Objectif : fournir les outils contextuels au manager.

Contenu :

* Formation.
* AUTOFILL.
* COMBLER.
* Invitations.
* Demandes.
* Terminer la session.

AUTOFILL : organise les participants présents, sans recrutement externe.

COMBLER : recherche des joueurs externes pertinents, puis permet d’envoyer des invitations individuelles.

Précision CPC V2 : AUTOFILL est gratuit ; COMBLER est réservé aux utilisateurs Pro.

États :

* Permission révoquée.
* Double invitation.
* Demande expirée.
* Session fermée.

Admission à une session

[VALIDÉ]

Une demande spontanée nécessite l’approbation d’un manager.

Une invitation émise par le manager est préapprouvée.

Son acceptation donne accès à la session sans seconde validation, mais ne garantit pas une place titulaire.

Le joueur admis et non placé rejoint le banc.

Gestion des demandes

Les demandes spontanées sont visibles dans une file discrète avec compteur.

Le manager dispose d’un panneau de revue avec acceptation ou refus individuel.

Invitations LIVE

Statuts :

* En attente.
* Acceptée.
* Refusée.
* Expirée.
* Annulée.

Une seule invitation active par joueur et session.

Annulation possible seulement avant acceptation.

Les conflits et actions simultanées sont résolus côté serveur.

Départ individuel

* Immédiat après confirmation serveur.
* Libère la place.
* Actualise les autres participants.
* Ne quitte pas le club permanent.
* Ne désactive pas automatiquement le Radar.

Fermeture de session

Le manager confirme explicitement la fermeture, avec affichage du nombre de participants.

La fermeture :

* Termine la session.
* Invalide demandes et invitations.
* Conserve un historique authentique.

Expiration et prolongation

Expiration TTL : clôture automatique.

Prolongation par manager :

* 30 minutes.
* 60 minutes.
* 120 minutes.

Confirmation obligatoire par le serveur.

Rappel discret avant échéance.

Propositions UX à 10 minutes puis 2 minutes : [À ARBITRER en QA].

Avis vérifiés

Éligibilité uniquement en cas de présence authentique sur une feuille finalisée, selon les règles métier retenues.

Une session CPC n’est jamais une preuve qu’un match EA a été joué.

⸻

7. Profil joueur

[VALIDÉ]

Accessible aux membres authentifiés de CPC, sauf protections liées aux blocages et aux données sensibles.

L’exposition dans CPC ne signifie pas que le profil est accessible publiquement sur Internet.

Informations principales

* Identité EA.
* Avatar.
* Poste principal.
* Postes secondaires.
* Club(s).
* Statut LIVE attesté.
* Statistiques EA.
* Réputation.
* Parcours.

Statistiques adaptées au poste

Le résumé dépend du poste principal.

Exemples :

* Attaquant : indicateurs offensifs.
* Défenseur : indicateurs défensifs disponibles.
* Milieu défensif : indicateurs pertinents réellement exposés par EA.

La vue complète reste accessible.

Toujours afficher la provenance et la période.

Aucune statistique modifiable manuellement.

Aucun score synthétique inventé.

Réputation

Critères :

* Esprit d’équipe.
* Communication.
* Fair-play.

Agrégats publics et commentaires sensibles privés ou modérés.

Pas de note globale artificielle.

Pas de pénalité pour absence de vocal.

Aucun avis non vérifié présenté comme vérifié.

Modification du profil

Édition par panneaux courts et enregistrements indépendants :

* Identité.
* Postes.
* Présentation.

Paramètres de compte séparés.

La modification de l’identifiant EA dépendra des règles réelles de liaison et de synchronisation.

PRO-01 — Profil personnel

Objectif : consulter et mettre à jour son identité footballistique.

Contenu :

* En-tête.
* Statistiques.
* Réputation.
* Clubs.
* Mes invitations.
* Paramètres.

Actions :

* Modifier par section.
* Ouvrir les statistiques.
* Inverser PRIMARY et SECONDARY.
* Accéder aux invitations.

États :

* Compte EA non lié.
* Statistiques absentes.
* Édition refusée.
* Deux affiliations.

PRO-02 — Profil d’autrui

Objectif : évaluer un joueur sans friction.

Contenu :

* Identité.
* Postes.
* Statistiques adaptées.
* Réputation agrégée.
* Affiliations.
* LIVE réel.

Actions :

* Message.
* Invitation LIVE ou Club si autorisé.
* Signaler.
* Bloquer.

États :

* Utilisateur bloqué.
* Compte supprimé.
* Permissions manquantes.

⸻

8. Affiliations et identité Club

Un joueur peut avoir au maximum :

* 1 PRIMARY
* 1 SECONDARY

L’inversion PRIMARY/SECONDARY est explicite depuis « Mes clubs ».

Elle ne provoque :

* Aucun départ du club.
* Aucune perte d’historique.
* Aucun changement de rôle OWNER ou Manager.

Pour rejoindre un troisième club, il faut confirmer explicitement le remplacement du SECONDARY.

Changer le club actif pour naviguer ne modifie pas PRIMARY.

Quitter un club ordinaire est immédiat, sans approbation manager.

Les historiques sont conservés.

Espace Club commun

Accessible à tous les membres autorisés de CPC.

Contenu :

* Identité du club.
* Recrutement ouvert ou fermé.
* Langue.
* Niveau déclaré.
* Postes recherchés.
* Effectif.
* Statistiques réelles.

Le bouton « Gérer le club » n’est visible qu’avec les permissions appropriées.

Les rôles proviennent du serveur.

CLB-01 — Fiche Club

Objectif : comprendre un club.

Contenu :

* Logo.
* Nom.
* Description.
* Langue.
* Recrutement.
* Effectif.
* Session LIVE réelle.

Actions :

* Voir effectif.
* Candidater.
* Rejoindre LIVE selon droits.
* Gérer le club si autorisé.

États :

* Club fermé.
* Club supprimé.
* Recrutement fermé.
* LIVE absent.

CLB-02 — Effectif

Objectif : consulter les membres permanents.

Classement par poste principal :

* Gardiens.
* Défenseurs.
* Milieux.
* Attaquants.

Un joueur apparaît une seule fois.

Son rôle est visible.

Actions :

* Ouvrir une fiche membre.
* Rechercher.

États :

* Groupe vide.
* Poste inconnu.
* Rôle modifié.

CLB-03 — Fiche membre contextuelle

Objectif : consulter ou gérer un membre.

Contenu :

* Profil bref.
* Actions autorisées.
* Section Gestion seulement avec permission.

Actions :

* Profil complet.
* Message.
* Modifier un rôle autorisé.
* Retirer un membre avec confirmation.

États :

* OWNER protégé.
* Rôle changé.
* Action concurrente.

CLB-04 — Gérer le club

Objectif : piloter les opérations autorisées.

Contenu :

* Candidatures.
* Invitations.
* Membres.
* Recrutement.
* Paramètres.
* Accès LIVE.

Actions :

* Traiter les candidatures.
* Suivre les invitations.
* Modifier les paramètres autorisés.

États :

* Aucun droit.
* Rôle révoqué.
* Listes vides.
* Réseau indisponible.

⸻

9. Candidatures et invitations permanentes

Candidatures

Les candidatures prennent la forme de cartes compactes affichant :

* Pseudo.
* Poste.
* Quelques statistiques disponibles.
* Message facultatif.

Fiche détaillée avec :

* Accepter.
* Refuser.
* Discuter.

L’action « Discuter » ne change pas le statut « En attente ».

Si les deux affiliations sont occupées, le joueur doit confirmer le remplacement du SECONDARY avant l’adhésion définitive.

Invitations Club permanentes

Une invitation Club peut être envoyée depuis Explorer ou le profil joueur.

Le manager choisit parmi les clubs qu’il est autorisé à gérer.

Il retrouve le suivi dans « Gérer le club ».

Le joueur reçoit une notification et retrouve l’invitation dans :

Profil → Mes invitations

Deux onglets :

* En attente.
* Historique.

Acceptation ou refus explicites.

Une invitation annulée, expirée ou déjà traitée devient non actionnable.

Les invitations LIVE restent distinctes et prioritaires.

INV-01 — Mes invitations

Objectif : retrouver les offres de recrutement.

Contenu :

* Cartes de clubs.
* Statuts.
* Détails.
* Historique.

Actions :

* Accepter.
* Refuser.
* Consulter le club.

États :

* Invitation périmée.
* Affiliations pleines.
* Club supprimé.
* Concurrence.

INV-02 — Invitations envoyées

Objectif : suivre les recrutements manager.

Contenu :

* Statuts et dates.
* Identité du joueur.
* Actions contextuelles.

Actions :

* Annuler tant que non acceptée.
* Consulter le joueur.

États :

* Déjà acceptée.
* Refusée.
* Expirée.

⸻

10. Gouvernance et permissions

Action	OWNER	Manager	Joueur
Voir club / effectif	Oui	Oui	Oui
Participer à LIVE	Oui	Oui	Oui
Gérer feuille LIVE	Oui	Oui	Non
Gérer candidatures et invitations	Oui	Oui	Non
Retirer membre ordinaire	Oui	Oui	Non
Modifier présentation club	Oui	Oui	Non
Promouvoir / rétrograder manager	Oui	Non	Non
Transférer propriété	Oui	Non	Non

Règles OWNER

Le transfert de propriété est obligatoire avant le départ si le club possède d’autres membres.

Le successeur doit :

* Être membre permanent.
* Accepter explicitement le transfert.

Une seule demande active de transfert par club est proposée comme garde-fou.

L’OWNER conserve ses droits jusqu’à l’acceptation et la confirmation serveur.

Après transfert :

* L’ancien OWNER devient membre ordinaire.
* Il peut quitter le club.

Si le club ne possède que l’OWNER, un parcours explicite de dissolution peut être prévu avec conservation appropriée des historiques.

Interdictions

* Aucun manager ne peut retirer l’OWNER.
* Aucun manager ne peut promouvoir un autre manager.
* Aucune escalade de privilèges via l’interface ou les API.
* Changements sensibles avec confirmation et traçabilité serveur.

⸻

11. Messages, notifications, confiance et modération

Messagerie

Les messages sont contextuels.

Accès depuis :

* En-tête.
* Profils.
* Candidatures.
* Invitations.
* Sessions.

Aucun onglet Messages permanent.

Notifications

Centre unifié avec priorisation :

1. Urgences LIVE.
2. Décisions importantes.
3. Autres événements selon préférences.

Fonctionnalités :

* Déduplication.
* États lus.
* Expiration.
* Suppression des CTA devenus invalides.

Trust & Safety

Permettre de signaler :

* Utilisateur.
* Message.
* Club.
* Avis.

Le blocage doit être appliqué à :

* Découverte.
* Messages.
* Invitations.

Modération et recours conformes aux règles backend.

Aucun commentaire sensible rendu public par défaut.

Suppression de compte accessible depuis les paramètres.

Les règles de conservation et d’anonymisation restent à définir.

⸻

12. États transversaux et micro-interactions

État	Comportement UX attendu
Chargement	Skeleton ou indicateur contextuel
Vide	Expliquer la cause et proposer une action utile
Erreur réseau	Message concret, retry, conservation de la saisie et du contexte
Action serveur en attente	État pending, aucune confirmation définitive prématurée
Conflit concurrent	Rafraîchir l’état serveur et expliquer la modification
Permission refusée	Masquer l’action interdite et expliquer si les droits changent
Expiration	Session ou invitation non actionnable
Blocage / modération	Aucun contournement via recherche, URL, notification ou profil
Accessibilité	Contrastes, zones tactiles, lecteurs d’écran, adaptation des textes, Reduce Motion
Animations	Transitions courtes, retour tactile, néon LIVE modéré, aucune boucle inutile

⸻

13. Critères d’acceptation par parcours

* [ ]	Navigation : trois onglets seulement, manager contextuel et préservation du scroll.
* [ ]	Radar : aucune activation implicite, durée serveur cohérente, expiration visible.
* [ ]	Explorer : filtres par intention, aucune disponibilité fictive, alertes opt-in.
* [ ]	Candidature : message facultatif, candidature active unique, discussion sans changement de statut, acceptation/refus idempotents.
* [ ]	Invitation LIVE : acceptation manager donnant directement accès à la session, banc par défaut, invitation expirée impossible.
* [ ]	Demande LIVE : admission spontanée uniquement après approbation manager.
* [ ]	Terrain : aucun non-participant, placement tactile, swap confirmé, retour au banc.
* [ ]	Clôture LIVE : confirmation manager, participants et invitations mis à jour, historique authentique.
* [ ]	Prolongation : 30/60/120 minutes, explicite, confirmée et expiration effective.
* [ ]	Profil : statistiques selon poste si disponibles, source, période et réputation vérifiée.
* [ ]	Affiliations : inversion PRIMARY/SECONDARY atomique, remplacement du secondaire avec consentement.
* [ ]	Club : effectif par famille de postes, fiche contextuelle, actions autorisées.
* [ ]	Invitations Club : envoi depuis Explorer/profil, suivi manager, Mes invitations, absence de doublons actifs.
* [ ]	Gouvernance : OWNER seul responsable de la nomination manager, transfert accepté, aucun club orphelin.
* [ ]	Trust & Safety : blocage, signalement, suppression de compte et absence de fuite de données.
* [ ]	Robustesse : aucun succès sans confirmation serveur, erreurs et réseau dégradé testés.

⸻

14. QA recommandée : scénarios prioritaires

1. Joueur sans club → Explorer → candidature → échange manager → acceptation → PRIMARY.
2. Joueur avec PRIMARY + SECONDARY → invitation Club → remplacement du secondaire → affiliations cohérentes.
3. Manager → Explorer Joueurs → invitation LIVE → acceptation → banc → placement terrain → départ joueur.
4. Deux managers déplacent simultanément le même joueur → conflit et réconciliation.
5. Invitation LIVE acceptée au moment de l’expiration de session → aucun état incohérent.
6. Manager prolonge à l’échéance → confirmation serveur et nouveau TTL ; erreur réseau sans faux succès.
7. Manager termine une session avec participants → confirmation, clôture, invitations invalidées.
8. OWNER propose transfert → successeur refuse → OWNER conservé ; nouveau successeur accepte → transfert atomique.
9. Manager tente de promouvoir un manager, retirer OWNER ou accéder à un autre club via API → refus serveur.
10. Utilisateur bloque un autre → recherche, invitation, message et notification ne contournent pas le blocage.
11. Statistiques EA absentes, profil incomplet, avis non vérifiés → aucune métrique ou badge fictif.
12. Petits écrans, clavier, lecteurs d’écran et réduction des animations → interface utilisable.

Adaptation CPC V2 : effectuer ces tests sur navigateurs mobiles iOS et Android ainsi que sur desktop.

⸻

15. Écarts et dépendances avec le MASTER PLAN RELEASE CPC

Sujet	Référentiel initial	Cible UX
Navigation	Modes PLAYER / MANAGER, Activité, Messages, dashboard Club	Accueil / Explorer / Profil, contextuel
Scout	Scout joueur et club	Explorer par intention ; recherche Joueurs côté manager
LIVE	Durées 30/60/120 et Match Manager	Prolongation, file de demandes, terrain central
Clubs	OWNER / MANAGER / MEMBER	PRIMARY / SECONDARY et transfert accepté
EA	Données réelles uniquement	Résumé adapté au poste
Safety	Blocage, modération, suppression	Parcours UX intégrés
Publication	Audit, QA, backend, stores	Contrôles de release adaptés au produit cible

Le document original interdisait le démarrage de la Phase 3 de CPC V1 sans arbitrage.

Pour CPC V2, le nouveau registre de décisions, l’architecture validée et les gates spécifiques au clean rebuild remplacent cette dépendance au cycle de release V1.

⸻

16. Points à vérifier ou arbitrer

Liste originale des sujets non résolus :

* Inventaire exact des routes, composants et permissions existants.
* Champs EA effectivement disponibles par poste.
* Périmètre temporel et fréquence de rafraîchissement des données EA.
* Transfert OWNER, inversion d’affiliations et remplacement SECONDARY atomique.
* Expiration et prolongation LIVE : TTL, rappels, concurrents et anti-abus.
* Visibilité Radar des joueurs affiliés et des joueurs en session.
* Visibilité des profils et historiques au regard des blocages et de la protection des données.
* Dissolution : historiques, messages, statistiques, conservation et propriété.
* Textes définitifs, accessibilité, seuils de notification et paramètres.
* Répartition des fonctions entre lancement V1 et versions ultérieures.

Pour CPC V2, ces points doivent être rapprochés du registre consolidé des décisions D-01 à D-39. Une décision déjà validée dans ce registre ne doit pas être rouverte implicitement.

⸻

17. Conditions d’entrée en implémentation

Conditions définies dans le document original :

1. Valider le cahier comme cible de conception.
2. Auditer les écarts sans écriture.
3. Arbitrer explicitement les changements de périmètre.
4. Rédiger les lots et tests.
5. Obtenir une autorisation distincte avant toute modification de code, base, branche, push ou déploiement.

Pour CPC V2 :

* La nouvelle SPEC et les ADR constituent la référence de développement.
* Le registre consolidé définit les décisions métier.
* CPC V1 reste intégralement en lecture seule.
* Les accès Supabase et GitHub doivent être limités aux ressources V2 autorisées.
* Les critères de chaque phase doivent être réellement exécutés.
* Aucun passage à la phase suivante sans validation explicite.

⸻

FIN — CAHIER UX CPC V1

Référence de conception originale du 25 octobre 2026, retranscrite en Markdown et accompagnée de notes de compatibilité CPC V2. Ce document ne constitue pas une preuve d’implémentation, de tests ou de déploiement.
