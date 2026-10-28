# CPC V2 — 23 · Brief d'exécution P2-A : design system et shell premium iPhone

**Statut :** **GO P2-A donné par Selim le 27/10/2026** ; D-41 ✅ (palette amendée : noir, vert, blanc, gris) ; D-42 ✅. **Livré** (#28 à #31, finitions #33, validé par Selim le 28/10).
**Écart d'exécution :** le risque prévu au §9 s'est réalisé. `@radix-ui/react-dialog` injecte un `<style>` sans nonce (via `react-remove-scroll`), ce que bloque la CSP. Il a donc été **retiré**, et la sheet est construite sur le `<dialog>` natif. Seul `@radix-ui/react-slot` est conservé. Les mentions de Radix Dialog ci-dessous sont historiques.
**Nature :** UI seule. **Aucune migration, aucune nouvelle table, aucune nouvelle commande, aucune nouvelle fonctionnalité métier.** Seuls les écrans et données existants sont redessinés.
**Références :** cahier UX §1, §2, §7, §12 · SPEC UX-01..04 · ADR-0006 (shadcn/ui, tokens, WCAG AA, ≥ 44 px, Reduce Motion), ADR-0017 (CSP à nonce) · `docs/22`.

---

## 1. Objectif

Faire de CPC une application qui se ressent **native sur iPhone** : surfaces sombres et profondes, typographie système iOS, listes groupées, panneaux inférieurs, en-tête et barre d'onglets translucides, accent néon réservé au LIVE. On quitte le « formulaire web à grandes cartes blanches ».

**Critère de réussite :** sur la Preview, en PWA installée, Selim ne reconnaît plus une page web générique. Les écrans existants (connexion, onboarding, Accueil, Explorer, Profil) suivent tous le même système, sans aucune perte de fonctionnalité, de sécurité ou d'accessibilité.

---

## 2. Direction visuelle « Stade de nuit » (D-41 ✅ — palette noir, vert, blanc, gris)

Inspiration : un stade éclairé la nuit. Fond profond, surfaces superposées, lumière néon **réservée au LIVE**. Le thème clair reste complet, car l'iPhone peut être réglé en clair.

### 2.1 Couleurs (tokens CSS, `globals.css`)
Palette validée par Selim : **noir, vert, blanc, gris**. Aucune autre teinte de marque. Le vert de marque (`--accent`) et le vert LIVE (`--live`) sont distincts : le LIVE se reconnaît à son **halo lumineux et à son libellé « LIVE »**, jamais à la seule couleur.

| Token | Sombre (par défaut) | Clair | Usage |
|---|---|---|---|
| `--bg` | `#050607` | `#F2F2F4` | fond d'application |
| `--surface-1` | `#111315` | `#FFFFFF` | sections, listes groupées |
| `--surface-2` | `#181A1D` | `#F7F7F8` | éléments surélevés, champs |
| `--surface-3` | `#22252A` | `#E9E9EC` | pressé, sélection |
| `--separator` | `rgb(255 255 255 / 0.08)` | `rgb(0 0 0 / 0.08)` | filets 0,5 px |
| `--text` | `#F5F5F5` | `#0A0A0A` | texte principal |
| `--text-2` | `#A1A1A6` | `#5C5C63` | secondaire |
| `--text-3` | `#828289` | `#6E6E75` | tertiaire |
| `--accent` | `#22C55E` | `#0F7A3A` | actions principales, liens, onglet actif |
| `--on-accent` | `#050607` (noir) | `#FFFFFF` | texte sur accent |
| `--live` | `#39FF88` | `#009B4C` | **LIVE uniquement** : pastille, halo, terrain (élément graphique) |
| `--live-text` | `#39FF88` | `#00803F` | libellé « LIVE » |
| `--danger` | `#FF6B6B` | `#C62828` | destructif, erreurs |

Contrastes calculés (WCAG 2.1) : texte 18,6:1 et 17,7:1 · texte secondaire 7,2:1 et 6,6:1 · tertiaire 4,9:1 et 4,5:1 · accent sur fond 8,9:1 et 5,4:1 · texte sur accent 8,9:1 et 5,4:1 · libellé LIVE 15,3:1 et 5,1:1 · danger 6,7:1 et 5,6:1. Le test unitaire de P2-A (§7) les revérifie.

Règles : `--live` n'est **jamais** utilisé pour un état non LIVE. Pas d'autre couleur : les états d'avertissement utilisent le texte et les icônes, pas une teinte supplémentaire.

### 2.2 Typographie
Pile système : `-apple-system, "SF Pro Text", "SF Pro Display", system-ui, …`, soit SF Pro natif sur iPhone, **sans police externe** (CSP, performance, pas de requête tierce).
| Style | Taille / interligne | Graisse | Usage |
|---|---|---|---|
| `large-title` | 34 / 41 | 700 | titre d'écran (Accueil, Explorer, Profil) |
| `title-2` | 22 / 28 | 700 | titres de section, nom de profil |
| `headline` | 17 / 22 | 600 | intitulés de ligne |
| `body` | 17 / 22 | 400 | texte courant (16 px minimum dans les champs) |
| `subhead` | 15 / 20 | 400 | métadonnées |
| `footnote` | 13 / 18 | 400 | aides, mentions |
| `caption` | 12 / 16 | 500 | libellés d'onglets, chips |
Chiffres en `tabular-nums` (comptes à rebours futurs). Respect du zoom texte : tailles en `rem`, aucune hauteur fixe sur du texte.

### 2.3 Espace, formes, matières
- Grille 4 pt ; marges d'écran 16 px ; sections espacées de 24 à 32 px.
- Rayons : 10 (champs, chips), 14 (lignes et sections groupées), 22 (cartes hero), 28 (haut des sheets), cercle (avatars).
- **Pas de bordures épaisses** : séparation par niveaux de surface et filets de 0,5 px.
- Matière translucide pour l'en-tête et la barre d'onglets : `backdrop-filter: blur(20px) saturate(180%)` sur `--bg` à 72 % d'opacité, avec repli opaque si non supporté.
- Ombres seulement en clair, très douces ; en sombre, la profondeur vient des surfaces.

### 2.4 Mouvement
Durées 160 à 280 ms, courbe `cubic-bezier(0.2, 0.8, 0.2, 1)`. Pression : `scale(0.98)` + `--surface-3`. Sheet : glissement depuis le bas (240 ms). **Aucune boucle d'animation.** Avec `prefers-reduced-motion`, tout devient instantané (déjà global), sans déplacement.

### 2.5 LIVE (préparé, non affiché)
Composants `LivePill` et `LiveHalo` définis (halo statique `box-shadow` néon, pulsation unique de 1,2 s à l'apparition, désactivée en Reduce Motion). **Ils n'apparaissent dans aucun écran en P2-A** (aucune donnée LIVE n'existe) : seulement dans la galerie de développement.

---

## 3. Dépendances (D-42, à valider)
| Paquet | Raison | Contrôle |
|---|---|---|
| shadcn/ui (CLI, code copié dans `src/components/ui`) + `@radix-ui/react-dialog`, `@radix-ui/react-slot` | sheet accessible (focus piégé, Échap, `aria-modal`), composition de boutons (ADR-0006) | versions épinglées ; licences MIT |
| `lucide-react` | jeu d'icônes cohérent, arbre importé icône par icône | version épinglée ; licence ISC |
Aucune autre dépendance. Pas de bibliothèque d'animation, pas de police, pas de CDN.

---

## 4. Livrables

### 4.1 Primitives `src/components/ui/`
| Composant | Spécification | Acceptation |
|---|---|---|
| `Button` | variantes `primary` (accent), `secondary` (surface-2), `ghost`, `destructive` ; tailles `md` (44 px) et `lg` (52 px) ; état `pending` intégré (reprend le verrou A-3 de `PendingButton`) | ≥ 44 px ; focus visible ; un seul envoi (test A-3 conservé) |
| `IconButton` | 44 × 44, `aria-label` obligatoire (type TS) | axe |
| `ListSection` / `ListRow` | liste groupée iOS : titre de section, lignes avec icône, libellé, valeur, chevron ou action, filets internes | lignes ≥ 44 px ; ligne-lien = `<a>` |
| `Sheet` | panneau inférieur (Radix Dialog), poignée, coins 28, safe area basse, **une seule sheet ouverte** à la fois (contexte global), fermeture : Échap, tap sur le voile, bouton Fermer | focus piégé puis rendu ; `aria-modal` ; pas de sheet empilée (test) |
| `TextField` / `TextArea` | libellé visible, aide, erreur liée par `aria-describedby`, 16 px minimum, compteur pour la présentation (≤ 280) | labels inchangés pour les tests |
| `SegmentedControl` | préparé pour Explorer (P2-F) ; non utilisé en P2-A hors galerie | clavier (flèches) |
| `Chip` | statique ou effaçable (`aria-label` « Retirer … ») | — |
| `Avatar` | URL signée existante (`<img>`, jamais `next/image`, ADR-0015) ou monogramme ; tailles 32, 48, 96 | `alt` correct |
| `Badge` | compteurs et statuts (`déclaré`, `provisoire`) | — |
| `Skeleton`, `EmptyState`, `InlineStatus` | refonte des composants `states/*` existants, même sémantique (`role="status"`, `role="alert"`) | tests `states.spec` conservés |
| `LivePill`, `LiveHalo` | §2.5, galerie seulement | Reduce Motion |

### 4.2 Shell
- **En-tête** : matière translucide, safe area haute ; à gauche le titre compact (qui apparaît quand le grand titre de l'écran défile hors de vue) ; à droite, l'emplacement d'actions **vide** (Radar, notifications : lots P2-B et P2-G). Pas de logo-lien redondant sur Accueil.
- **Barre d'onglets** : matière translucide, icônes `lucide` (Accueil, Explorer, Profil), libellés `caption`, onglet actif en `--accent` plein, inactifs en `--text-2` ; zone ≥ 56 px + safe area ; `aria-current="page"` conservé.
- **Grand titre** par écran (`large-title`) qui laisse place au titre compact de l'en-tête au défilement (IntersectionObserver, sans scroll listener coûteux).
- **Transitions** : aucune animation de page imposée (Next.js), seulement les micro-interactions.

### 4.3 Écrans (données existantes uniquement)
| Écran | Refonte | Interdits |
|---|---|---|
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | écran centré verticalement, nom CPC en `title-2`, champs `TextField` sur `surface-2`, bouton `lg` pleine largeur, liens secondaires en `ghost` ; liens légaux discrets en pied | aucun bouton Google (non configuré) |
| `/onboarding` | même formulaire et même action `complete_onboarding`, présenté en **3 étapes** à l'écran (Identité → Postes → Confirmation d'âge), un seul envoi final ; postes en grille de chips par groupe GK/DEF/MID/ATT | aucun champ ajouté ni retiré |
| `/home` (ACC-01, compte neuf) | grand titre « Accueil » ; bloc hero : avatar + pseudo + poste principal (données réelles) ; **une action dominante « Explorer »** ; bloc secondaire : raccourci vers le profil | ni Radar, ni club, ni suggestion inventée |
| `/explore` | grand titre ; `EmptyState` véridique (« Les clubs et sessions apparaîtront ici dès leur ouverture ») | pas de contrôle segmenté actif, pas de faux résultats |
| `/profile` | **hero** (avatar 96, pseudo `title-2`, chips plateforme + postes) ; `ListSection` « Profil » : Présentation, Gamertag EA (badge « déclaré »), Avatar — chaque ligne ouvre une **sheet d'édition** courte (même Server Action, même validation, mêmes messages) ; `ListSection` « Compte » : Se déconnecter (destructive) | pas de statistiques, réputation, clubs ni invitations (lots ultérieurs) |
| `not-found`, `error`, `global-error`, `/legal/*` | styles du système | — |

---

## 5. Contraintes techniques non négociables
1. **CSP (ADR-0017)** : aucun attribut `style="…"` rendu côté serveur (bloqué par `style-src` à nonce). Styles uniquement par classes Tailwind ou variables CSS. Les styles posés en JS par Radix (CSSOM, côté client) sont autorisés, mais à **vérifier** : le test smoke qui capture les erreurs CSP de la console doit rester vert sur chaque écran et à l'ouverture d'une sheet.
2. **Aucune requête tierce** : pas de police, d'icône ni d'image distante.
3. **Sécurité inchangée** : gardes `requireOnboardedUser`, Server Actions, validation Zod, URL signées, verrou A-3 ; aucun `dangerouslySetInnerHTML` ; aucun `getSession()`.
4. **Accessibilité** : WCAG 2.1 AA, cibles ≥ 44 px, VoiceOver (ordre de lecture, libellés d'onglets et de sheets), focus visible, Reduce Motion, champs ≥ 16 px.
5. **Sélecteurs de test stables** : les noms accessibles existants (« Se connecter », « Adresse email », « Mot de passe », « Accueil », « Explorer », « Profil », « Se déconnecter », « Envoi en cours… »…) sont **conservés**. Tout changement de texte met à jour les tests dans la même PR, **sans affaiblir** leurs assertions.
6. **iPhone** : safe areas, `viewport-fit=cover`, barre d'état `default` (A-4), PWA standalone, aucun débordement horizontal à 320 px de large.
7. **Galerie de développement** `/dev/ui` : visible seulement si `ENABLE_UI_GALLERY=1` (jamais défini sur Vercel) ; sinon `notFound()`. Elle sert aux captures et à la revue.
8. **Poids** : relever le « First Load JS » par route avant et après (`pnpm build`) et le consigner dans chaque PR ; toute hausse supérieure à 30 kB gzip sur une route est justifiée.

---

## 6. Découpage en PR (dans l'ordre)
| PR | Contenu | Agent | Dépend de |
|---|---|---|---|
| **A1** | Tokens (§2), typographie, init shadcn, `Button`, `IconButton`, `TextField`, `Chip`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `InlineStatus`, galerie `/dev/ui` | UI | GO + D-41 + D-42 |
| **A2** | Shell : en-tête translucide, grand titre / titre compact, barre d'onglets, `Sheet` (+ règle « une seule sheet »), `ListSection` / `ListRow`, `LivePill` / `LiveHalo` (galerie) | UI | A1 |
| **A3** | Écrans d'auth et onboarding en 3 étapes | UI | A2 |
| **A4** | Accueil, Explorer, Profil (hero + sheets d'édition), pages d'erreur et légales | UI | A2 |
| **A5** | Campagne QA : e2e complétés, captures iPhone clair/sombre de chaque écran, axe, rapport | QA | A3, A4 |
A3 et A4 peuvent avancer en parallèle (fichiers distincts).

---

## 7. Tests et preuves exigés
| Type | Contenu |
|---|---|
| CI | 5 checks verts sur le SHA exact de chaque PR |
| E2E existants | tous conservés et verts (`auth-flows`, `onboarding`, `navigation`, `states`, `profile`, `a11y`, `smoke`, `legal-pwa`, `observability`) |
| E2E nouveaux | sheet : ouverture, focus piégé, Échap, voile, **impossible d'en empiler deux** ; profil : édition présentation / gamertag / avatar **via sheet** puis persistance ; onboarding en 3 étapes : retour arrière sans perte, un seul envoi ; titre compact au défilement ; aucune erreur CSP à l'ouverture d'une sheet |
| Accessibilité | axe 0 violation critique ou sérieuse sur chaque écran (clair et sombre) ; navigation au clavier ; Reduce Motion émulé |
| Visuel | `toHaveScreenshot` sur `/dev/ui` et les écrans principaux, projet `mobile-webkit` (iPhone), thèmes clair et sombre ; captures jointes à la PR |
| Contraste | test unitaire sur les paires de tokens (ratio ≥ 4,5:1 pour le texte informatif) |
| iPhone réel | après fusion et synchronisation de `preview` : parcours connexion → Accueil → Explorer → Profil → édition en sheet → déconnexion, en Safari puis en PWA, clair puis sombre ; rapport avec captures et version iOS |

---

## 8. Definition of Done
- [ ] D-41 et D-42 validés, GO P2-A reçu.
- [ ] PR A1 à A5 fusionnées, chacune avec CI verte, captures et First Load JS consignés.
- [ ] Aucune régression : tous les e2e existants verts ; aucune modification de `supabase/` ; aucun changement de sécurité.
- [ ] Revue iPhone réelle par Selim (§7) consignée dans un rapport.
- [ ] `docs/05_ARBORESCENCE.md` et ADR-0006 mis à jour (composants, tokens).

## 9. Hors périmètre
Radar, clubs, LIVE, notifications, messages, statistiques EA, réputation, paramètres avancés, Explorer à sous-intentions actives, Google OAuth, toute migration ou commande SQL, toute modification Vercel ou Supabase.

## 10. Risques
| Risque | Parade |
|---|---|
| Styles en ligne de Radix bloqués par la CSP | vérifier dès A1 (test CSP sur la galerie) ; sinon sheet maison sur `<dialog>` natif |
| `backdrop-filter` coûteux sur iPhone ancien | une seule couche floutée par écran ; repli opaque |
| Captures instables (polices, anti-crénelage) | captures en WebKit seulement, seuil de tolérance, masques sur les avatars |
| Dérive vers des fonctionnalités | revue Lead : tout élément sans donnée réelle est refusé |
| Casse des sélecteurs e2e | règle §5.5 |
