# CPC V2 — 24 · Rapport P2-A (design system, shell et écrans existants)

- **Statut :** 🟡 PRÉPARÉ — fusions et Preview faites ; campagne QA iPhone A5 **NON EXÉCUTÉE**.
- **Périmètre :** P2-A uniquement (GO-P2A, D-41 palette noir / vert / blanc / gris, D-42). Interface seule : aucune migration, aucune fonctionnalité nouvelle, aucune modification de la CSP ni de la RLS.
- **Référence :** brief `docs/23_BRIEF_P2A_DESIGN_SYSTEM.md` et master plan `docs/22` (PR #27, ouverte, non fusionnée).

## 1. Fusions (28/10/2026)

Fusions séquentielles par commit de fusion, chacune verrouillée sur le SHA testé. Après chaque fusion, l'arbre de `main` est comparé à celui du SHA testé : tous sont identiques.

| PR | Lot | SHA testé | CI (run) | Commit de fusion |
|---|---|---|---|---|
| #28 | A1 — tokens, typographie, primitives | `1d437f5` | 40561662171 ✅ 5/5 | `ebbd561` |
| #29 | A2 — shell, navigation, sheets | `5ba8325` | 40599839230 ✅ 5/5 | `361d2d5` |
| #30 | A3 — authentification, onboarding | `aff4eff` | 40600512727 ✅ 5/5 | `b1f0ea7` |
| #31 | A4 — Accueil, Explorer, Profil, états | `eaf0996` | 40601230159 ✅ 5/5 (tentative 2) | `f91a337` |

Les PR empilées ont été remises sur `main` sans force-push : rebasculement de la base, puis fusion de `main` dans la branche. Après fusion, l'arbre de chaque branche était identique à celui de sa tête précédemment verte.

## 1 bis. Main, Preview et Vercel

- **CI `main`** `f91a337` (push) : run 40602303058, ✅ 5/5.
- **`preview`** passée en avance rapide de `05f3ec8` à `f91a337`, sans force. HEAD `main` = HEAD `preview` = `f91a337`.
- **Déploiement Preview READY** : `dpl_4LQbCvp22UvL9KBLGYfZSK6TbNE9`, SHA `f91a337`. Statut GitHub « Vercel — Deployment has completed » à 23:34:24Z (UTC).
- **Aucune Production** : le push `main` (`2szrbbcnyG23Bf6KkLbYwwvojwe4`) a été « Canceled by Ignored Build Step ».
- **Vercel Authentication** : **NON VÉRIFIÉE** depuis l'environnement de Claude (proxy : `*.vercel.app` bloqué, et le connecteur Vercel ne voit plus le projet `cpc-v2-web`). À confirmer par Selim : une ouverture en navigation privée doit afficher l'écran de connexion Vercel.

## 2. Incidents

1. **e2e-webkit en échec sur #31 (violation CSP `style-src-elem`).** Un diagnostic par étape, ajouté au test (run 40570628534), a montré qu'en WebKit `page.screenshot()` de Playwright injecte lui-même un `<style>body {}</style>`. Notre CSP à nonce le bloque, ce qui est normal. C'est un artefact de l'outil de test : le HTML servi ne contient aucun `<style>` et le runtime React/Next n'en ajoute aucun. **Correctif limité aux tests** : la CSP est vérifiée juste avant chaque capture et après la fermeture de la sheet. **CSP inchangée.**
2. **Job e2e en échec sur #31 après remise à niveau.** L'échec est survenu à l'étape « Supabase local » (infrastructure CI), avant tout test, avec un arbre identique au SHA vert. Une seule relance a été faite, verte.
3. **Connecteur Vercel.** `list_deployments` renvoie 403, `get_project` 404, et `list_projects` ne trouve plus `cpc-v2-web`. La vérification est passée par les statuts de commit GitHub publiés par Vercel. Aucune configuration n'a été modifiée.

## 3. Ce qui change visiblement sur iPhone

| Zone | Avant (Phase 1) | Après (P2-A) |
|---|---|---|
| Thème | Clair générique | Noir / vert / blanc / gris (D-41). Le thème suit le réglage de l'iPhone : sombre (fond #050607) ou clair (#F2F2F4) |
| Typographie | Tailles libres | Échelle de type iOS : grand titre, titre 2, headline, body, subhead, footnote, caption. Police système (SF Pro) |
| En-tête | Barre simple | Matière translucide (flou), « CPC » à gauche ; le titre compact apparaît quand le grand titre sort de l'écran |
| Barre d'onglets | Liens texte | 3 onglets avec icônes (Accueil, Explorer, Profil), onglet actif en vert, cibles ≥ 44 px, safe area respectée |
| Connexion / inscription / mot de passe | Formulaires bruts | Carte centrée (AuthShell), champs avec label et aide, bouton principal plein, liens secondaires discrets, message d'erreur en ligne |
| Onboarding | Un seul long formulaire | 3 étapes (Identité → Postes → Confirmation), indicateur « Étape x sur 3 », postes en tuiles groupées, envoi unique |
| Accueil | Texte | Carte identité (avatar, « Salut … », puces poste / plateforme), carte « Ton activité » avec action unique Explorer, raccourci Profil |
| Explorer | Texte | État vide illustré (« Rien à explorer pour l'instant ») |
| Profil | Formulaires empilés | Carte identité (avatar 96 px, pseudo, plateforme, postes), liste « Profil joueur » ; chaque champ s'édite dans une **sheet** du bas (Présentation, Identifiant EA, Photo) ; bloc Statistiques EA ; déconnexion en bouton rouge |
| États | Variés | Squelettes de chargement, bandeau hors ligne, pages 404 / erreur et pages légales restylées |

Rien de nouveau côté fonctionnel : aucun Radar, aucun club, aucune session, aucune donnée inventée (D-04).

## 4. Écrans à tester (A5)

URL : `https://cpc-v2-web-git-preview-selimkh31-4924s-projects.vercel.app` (protégée par Vercel Authentication). Compte QA preview-iphone existant (identifiants transmis hors Git).

| # | Écran | Route | Accès |
|---|---|---|---|
| E1 | Connexion | `/login` | sans compte |
| E2 | Connexion — erreur | `/login` + mauvais mot de passe | sans compte |
| E3 | Inscription | `/signup` | sans compte (affichage seulement : aucune création de compte réel) |
| E4 | Mot de passe oublié | `/forgot-password` | sans compte (affichage seulement) |
| E5 | Pages légales | `/legal/terms`, `/legal/privacy`, `/legal/support` | sans compte |
| E6 | Accueil | `/home` | compte QA |
| E7 | Explorer | `/explore` | compte QA |
| E8 | Profil | `/profile` | compte QA |
| E9 | Sheet Présentation (modifier, enregistrer) | `/profile` | compte QA |
| E10 | Sheet Identifiant EA | `/profile` | compte QA |
| E11 | Sheet Photo (envoyer, retirer) | `/profile` | compte QA |
| E12 | Déconnexion puis reconnexion | `/profile` → `/login` | compte QA |
| E13 | Page introuvable | `/nimporte-quoi` | — |
| E14 | PWA (écran d'accueil) : icône, barre d'état, safe area | — | compte QA |
| E15 | Onboarding 3 étapes | `/onboarding` | **nécessite un compte QA neuf non onboardé**. Le compte actuel est déjà onboardé : E15 est NON TESTABLE sans un second compte QA, à créer par Selim avec la même procédure que le premier, ou à reporter |

## 5. Grille QA des nouveaux composants

À remplir sur iPhone, en mode sombre **et** clair (Réglages → Luminosité). Statuts : ✅ conforme · ❌ anomalie · ⏸ non testé.

| ID | Composant / comportement | Où | Attendu | Sombre | Clair |
|---|---|---|---|---|---|
| Q1 | Couleurs D-41 | partout | Noir / gris / blanc ; vert réservé à l'action principale et à l'onglet actif | ⏸ | ⏸ |
| Q2 | Thème auto | partout | Bascule immédiate en changeant le réglage de l'iPhone ; barre d'état assortie | ⏸ | ⏸ |
| Q3 | Typographie | E6–E8 | Grand titre lisible, hiérarchie claire, rien de tronqué de façon gênante | ⏸ | ⏸ |
| Q4 | En-tête translucide | E6–E8 | Le contenu défile sous un en-tête flouté ; le titre compact apparaît en défilant | ⏸ | ⏸ |
| Q5 | Barre d'onglets | E6–E8 | 3 onglets, actif en vert, faciles à toucher, au-dessus de la barre d'accueil iOS | ⏸ | ⏸ |
| Q6 | Boutons | E1, E8 | Principal plein vert ; destructif rouge ; état « en cours » sans double envoi | ⏸ | ⏸ |
| Q7 | Champs de saisie | E1, E3, E9 | Label visible, pas de zoom intempestif au focus, clavier adapté (e-mail) | ⏸ | ⏸ |
| Q8 | Message d'erreur en ligne | E2 | Message clair sous le formulaire, couleur danger lisible | ⏸ | ⏸ |
| Q9 | Sheet | E9–E11 | Monte du bas, voile derrière, une seule à la fois, fermeture par « Fermer » ou tap sur le voile, la page derrière ne défile pas | ⏸ | ⏸ |
| Q10 | Enregistrement depuis une sheet | E9–E11 | La sheet se ferme, confirmation verte affichée, valeur mise à jour | ⏸ | ⏸ |
| Q11 | Liste réglages (ListRow) | E8 | Lignes alignées, chevron, détail sur 2 lignes maximum | ⏸ | ⏸ |
| Q12 | Puces (Chip) | E6, E8 | Poste principal mis en avant, postes secondaires neutres | ⏸ | ⏸ |
| Q13 | Avatar | E6, E8 | Photo ronde ou initiales en repli | ⏸ | ⏸ |
| Q14 | État vide | E7 | Icône, titre et texte centrés, sans faux contenu | ⏸ | ⏸ |
| Q15 | Squelettes | navigation entre onglets | Blocs gris pendant le chargement, sans saut brutal | ⏸ | ⏸ |
| Q16 | Hors ligne | mode Avion | Bandeau hors ligne visible, rien ne casse | ⏸ | ⏸ |
| Q17 | Réduire les animations | Réglages → Accessibilité | Aucune animation résiduelle (squelettes et sheets sans mouvement) | ⏸ | ⏸ |
| Q18 | Taille de texte agrandie | Réglages → Affichage | Texte agrandi sans chevauchement | ⏸ | ⏸ |
| Q19 | AuthShell | E1–E4 | Carte centrée, liens légaux en bas, rien sous l'encoche | ⏸ | ⏸ |
| Q20 | Onboarding par étapes | E15 | Continuer / Retour, progression, tuiles de postes, un seul envoi | ⏸ | ⏸ |

Captures attendues : une par écran (E1–E14), dans les deux thèmes, plus une capture de sheet ouverte.

## 6. Preuves automatisées déjà disponibles

- CI des quatre PR : 5/5 verts (tableau §1). e2e-webkit (iPhone 14 simulé) : 19 tests réussis sur #31, dont l'accessibilité axe, la CSP, la sheet et les cibles de 44 px sur les écrans de galerie.
- Tests sur Supabase local (CI) : onboarding en étapes, profil avec sheets, navigation, déconnexion.
- **Non couvert par la CI** : le rendu réel sur Safari iPhone, la PWA, la saisie au clavier iOS, les réglages d'accessibilité de l'appareil. C'est l'objet de A5.

## 7. Risques résiduels

- E15 (onboarding) n'est pas testable avec le compte QA actuel.
- `backdrop-filter` (en-tête translucide) : il existe un repli opaque via `@supports`, à vérifier visuellement (Q4).
- Rappels hors P2-A, inchangés : A-8 (protection contre les mots de passe compromis), région Vercel `lhr1`, restriction de l'intégration Supabase, suppression du compte QA en fin de campagne. G2 et Phase 1 restent HOLD.

## 8. Décision attendue

Après la campagne A5 :
- **GO** clôture P2-A ;
- ou **HOLD** avec la liste des anomalies à corriger, en PR UI uniquement.

P2-B ne démarre pas sans GO distinct.
