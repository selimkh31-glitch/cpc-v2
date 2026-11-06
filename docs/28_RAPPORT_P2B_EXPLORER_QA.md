# CPC V2 — B7 · QA de la première tranche Explorer Clubs

- **Statut :** PRÉPARÉ / NON EXÉCUTÉ SUR VRAI TÉLÉPHONE. Ce document ne constitue pas un PASS.
- **Date :** 6 novembre 2026
- **Produit :** CPC V2 uniquement ; jamais CPC V1.
- **Référence :** `docs/25_BRIEF_P2B_EXPLORER.md`, `docs/26_CONTRAT_B0_EXPLORER_CLUBS.md`, cahier UX, D-21/D-23/D-43/D-45 à D-48.
- **Release :** G2/HOLD maintenu jusqu'au rapport réel et aux autres gates de lancement public (issue #46).

## 1. Preuves techniques déjà recueillies

| Jalon | Preuve |
|---|---|
| B1 sécurité | migration staging `20261106120259_p2b_b1_security_blocks`, 0 fonction privée exécutable par les clients, RLS |
| B2 Clubs | migration staging `20261106125300_p2b_b2_clubs`, 0 club artificiel, contraintes OWNER/slots différables, RLS |
| B3 recherche | migration staging `20261106130459_p2b_b3_search_clubs`, RPC SECURITY INVOKER, anonyme interdit |
| B4 design | PR #39 fusionnée, composants premium testés |
| B5 création / gestion | PR #43 fusionnée, CI 5/5 sur SHA testé ; prise en compte sur main |
| B6 Explorer | PR #45 fusionnée, CI 5/5 sur `main` et Preview READY (`f58143a`) |
| Git / staging | migrations alignées via PR #37, #42 et #44 |

**Déploiement :** branche `preview` = `f58143aadc35a340f4811f430312369c78b28995`, déploiement Vercel `dpl_2BkpvLJnD8DcpbHwKiJLRxHyxJ36` READY et authentification Vercel maintenue. **Attention :** une CI verte n'est pas une revue utilisateur sur Safari réel.

## 2. Préflight obligatoire avant les tests iPhone

1. Vérifier `main` et `preview` alignés sur un HEAD vérifié (pas de force-push).
2. Vérifier 5/5 checks sur le SHA de `main` et déploiement Vercel Preview **READY** sur ce même SHA.
3. Vérifier l'alias stable `https://cpc-v2-web-git-preview-selimkh31-4924s-projects.vercel.app` et Vercel Authentication active.
4. Vérifier que le site utilise exclusivement **Supabase staging** `cglbsllwdmluvbisozyx` et aucune clé serveur sensible dans `NEXT_PUBLIC_*`.
5. Lire les advisors Supabase ; aucune nouvelle ERROR/critique.
6. Vérifier qu'aucun déploiement public Production n'a été effectué.
7. Le test doit utiliser des comptes QA clairement identifiés et isolés. Ne jamais créer un faux club présenté comme vrai à un public.

## 3. Scénarios fonctionnels manuels — cases NON EXÉCUTÉES

| ID | Vérification sur Safari/PWA iPhone | Résultat |
|---|---|---|
| B7-01 | Login QA déjà existant, session persistante après relance | ⏳ |
| B7-02 | Mode clair / sombre, header, tabbar, safe areas, affichage clavier | ⏳ |
| B7-03 | Explorer affiche seulement les intentions **Jouer / Clubs** ; Joueurs absent | ⏳ |
| B7-04 | Jouer n'invente aucune session LIVE | ⏳ |
| B7-05 | Aucun club : état honnête + CTA création | ⏳ |
| B7-06 | Créer club, étapes Identité → Jeu/langues/niveau → Recrutement | ⏳ |
| B7-07 | Champs obligatoires et validations en ligne ; double appui ne duplique pas | ⏳ |
| B7-08 | Le créateur devient OWNER du club et reste joueur | ⏳ |
| B7-09 | Profil > Mes clubs : club réel et slot PRIMARY/SECONDARY correct | ⏳ |
| B7-10 | Fiche : identité, effectif groupé GK/DEF/MID/ATT et niveau **déclaré** | ⏳ |
| B7-11 | OWNER modifie description / recrutement ; changement visible après reload | ⏳ |
| B7-12 | Compte joueur B connecté : club A visible si non bloqué ; gestion refusée | ⏳ |
| B7-13 | Recherche nom : casse/accents et recherche sans résultat | ⏳ |
| B7-14 | Filtres plateforme, recrutement, langue, niveau, poste | ⏳ |
| B7-15 | Effacer chaque filtre et « Tout effacer » ; URL/retour navigateur cohérents | ⏳ |
| B7-16 | Aucun CTA candidature ou statistique EA inventée | ⏳ |
| B7-17 | Hors connexion : message clair, aucune mutation prétendue réussie | ⏳ |
| B7-18 | Aucune fuite de profils / avatar en cas de blocage (couverture pgTAP B1+B2+B3) | ⏳ |
| B7-19 | Aucune régression Connexion, Accueil, Profil, avatar, déconnexion | ⏳ |
| B7-20 | VoiceOver, tailles de clic, contraste, iPhone petit/grand ; Android Chrome et desktop ensuite | ⏳ |

## 4. Méthode et traçabilité

- Pour chaque résultat, noter **date, appareil, URL, version du déploiement et capture**. Un test non fait reste « NON EXÉCUTÉ ».
- Limite D-21 : 1 création par 24 h et 2 affiliations maximum ; ne pas boucler avec le même compte pour tenter de créer plusieurs clubs.
- Comptes supplémentaires : QA identifiables, uniquement sur le staging ; aucun ID ni mot de passe dans les captures.
- Données de test staging : garder une liste de clubs et comptes QA ajoutés ; planifier un nettoyage contrôlé après la campagne. Ne pas supprimer directement des tables en production.
- Rejouer tous les tests automatiques après tout correctif de la campagne.
- Si une erreur RLS, erreur de profil/club, fuite de données ou échec de session survient : **HOLD**, issue reproductible et correctif ciblé.

## 5. Gates

**B7 technique** = CI main 5/5 + migrations staging présentes + Preview READY + scénarios P2-B exécutés et documentés.

**Lancement web public** ≠ B7 : reste soumis aux fonctions recrutement/LIVE/Safety, pages légales et suppression de compte, environnement de production isolé, OAuth/SMTP, surveillance, tests multi-appareils et GO explicite (issue #46 / `docs/06` Phase 7).
