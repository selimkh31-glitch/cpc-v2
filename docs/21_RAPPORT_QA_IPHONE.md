# CPC V2 — 21 · Rapport QA iPhone · Phase 1 (26/10/2026)

**Statut :** rapport validé par Selim le 26/10/2026. **G2 : HOLD. Phase 1 : HOLD.** Aucune Phase 2.
**Environnement :** Vercel Preview `cpc-v2-web` (branche `preview`, commit `1dde9fc`, protégée par Vercel Authentication) · Supabase staging `cglbsllwdmluvbisozyx` · iPhone, Safari puis PWA installée · un compte synthétique `qa_*@example.test` (campagne `preview-iphone`, non onboardé au départ).

## 1. Grille M1–M10 (`docs/18` §6.2)
| ID | Scénario | Résultat | Preuve |
|---|---|---|---|
| M1 | Accès protégé, HTTPS, CSP avec `upgrade-insecure-requests` | **PARTIEL** | Accès anonyme à l'alias : 302 vers la connexion Vercel (vérifié). En-têtes CSP du déploiement : non relevés. |
| M2 | Inscription | **ÉCHEC → à rejouer** | Lien de confirmation renvoyé vers `http://localhost:3000/?code=…` (*Site URL*, voir A-6). Compte non-QA créé pendant l'essai : supprimé (vérifié : 0 compte hors `qa_*`). Dépend aussi de D-18. |
| M3 | Onboarding complet puis Accueil | **PASS** | Staging : 1 profil, 3 postes, 1 clé d'idempotence, pseudo renseigné. |
| M4 | Navigation 3 onglets, barre au-dessus de la barre d'accueil iOS | **PASS** | Constat visuel de Selim. |
| M5 | Profil : présentation, gamertag, avatar depuis la pellicule | **PARTIEL** | Présentation, gamertag, avatar enregistrés et conservés ; 1 objet Storage dans le dossier du propriétaire, bucket privé. Refus du HEIC : non testé. |
| M6 | Mode avion → bandeau hors ligne | **NON EXÉCUTÉ** | — |
| M7 | Ajout à l'écran d'accueil, plein écran | **PASS** | Constat visuel de Selim. Lisibilité de la barre d'état en thème clair : voir A-4. |
| M8 | Déconnexion globale depuis un ordinateur → iPhone refusé | **NON EXÉCUTÉ** | Déconnexion locale et reconnexion : PASS (logs Auth, 2 `logout` en 204). |
| M9 | VoiceOver | **NON EXÉCUTÉ** | — |
| M10 | Réinitialisation du mot de passe | **NON EXÉCUTÉ** | D-18. |

**Bilan :** 3 PASS · 2 PARTIEL · 1 ÉCHEC · 4 NON EXÉCUTÉ.

## 2. Contrôles techniques du staging après la campagne (lecture seule)
| Contrôle | Résultat |
|---|---|
| Comptes | 1, synthétique ; aucun compte réel |
| Tables `public`/`private` sans RLS · `SECURITY DEFINER` sans `search_path` | 0 · 0 |
| Fonctions `api`/`private` exécutables par PUBLIC · `api` exécutables par anon | 0 · 0 |
| Bucket `avatars` | privé ; 0 objet hors du dossier de son propriétaire |
| D-38 (`rls_auto_enable()`, `ensure_rls`) | présents |
| Advisors sécurité | 3 INFO attendus ; **1 WARN** « Leaked Password Protection » désactivée (A-8) |
| H1–H5, ST1–ST6 | PASS (run `staging-http` 40349584301) |

## 3. Anomalies
| # | Gravité | Constat | Traitement |
|---|---|---|---|
| A-1 | 🔴 | Intégration Supabase de la marketplace Vercel appliquée à tous les projets : 17 variables **Production** dans `cpc-v2-web`, dont des clés secrètes (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_JWT_SECRET`, `POSTGRES_PASSWORD`). Projet Supabase cible non identifié. | Selim (Vercel) |
| A-2 | 🔴 | Un déploiement **Production** de `main` et un déploiement Preview de `main` existent (protégés). | Selim (Vercel) |
| A-3 | 🟠 | Double envoi du formulaire de connexion : 14 connexions réussies en 9 s ⇒ 13 sessions orphelines. | **Corrigé dans cette PR** |
| A-4 | 🟡 | Barre d'état PWA `black-translucent` : texte blanc illisible sur l'en-tête blanc (thème clair). | **Corrigé dans cette PR** (`default`) |
| A-5 | 🟡 | `/` affichait une page provisoire au lieu de rediriger selon la session (écart ADR-0005). | **Corrigé dans cette PR** |
| A-6 | 🟡 | *Site URL* restée `localhost` ; `docs/19` erroné (entrée exacte ≠ URL avec `?next=…`). | `docs/19` révisé dans cette PR ; contrôle de la *Site URL* : Selim |
| A-7 | ⚪ | Node 24.x au lieu de 22.x ; région `iad1` au lieu de `lhr1`. | Selim (Vercel) |
| A-8 | ⚪ | Advisor WARN « Leaked Password Protection ». | Réglage Auth : autorisation distincte |

## 4. Correctifs de cette PR
- **A-3 :** `PendingButton` (désactivé, `aria-busy`, libellé « Envoi en cours… ») + **verrou synchrone** contre un second envoi avant le rendu « en attente » (double appui, touche Entrée). Appliqué à `/login`, `/signup`, `/forgot-password` et `/reset-password`.
- **A-4 :** `statusBarStyle: "default"` ; `viewport-fit=cover` et les *safe areas* sont inchangés.
- **A-5 :** `/` → `/home` si la session est valide (`getClaims()`), sinon `/login`. Les liens légaux passent sur `/login`.
- **A-6 :** `docs/19` révisé (comportement Supabase, configuration cible sans joker).

## 5. Conditions de sortie du HOLD
1. A-1 et A-2 traités ; A-7 aligné.
2. Cette PR fusionnée, `preview` redéployée.
3. Campagne iPhone rejouée : M1 (en-têtes), M5 (HEIC), M6, M7 (barre d'état en thème clair), M8, M9 ; vérification qu'un seul envoi part par appui sur « Se connecter ».
4. Décision de Selim sur M2, M10 et A6 Google : débloquer D-18 / Google, ou les reporter formellement hors des critères G2.

## 6. Suivi (27/10/2026)
- A-1 : variables Production de l'intégration Supabase retirées de `cpc-v2-web` (vérifié : 4 variables, toutes Preview).
- A-2 : déploiements Production et de branches autres que `preview` supprimés ; aucun domaine Production rattaché (vérifié).
- A-7 : Node.js 22.x (vérifié).
- Ignored Build Step : contrôlé par une branche de test (résultat ci-dessous).
