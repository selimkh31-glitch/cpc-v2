# CPC V2 — 18 · Préparation technique de la première Preview (`cpc-v2-web`)

**Statut :** préparé, **rien n'est créé ni déployé** (GO séparé requis). Complète `docs/17_PLAN_PREVIEW_VERCEL.md`.
**Cibles exclusives :** dépôt `selimkh31-glitch/cpc-v2`, Supabase staging `cglbsllwdmluvbisozyx`.

## 1. Projet Vercel `cpc-v2-web` (création par Selim)
| Réglage | Valeur |
|---|---|
| Import Git | `selimkh31-glitch/cpc-v2` |
| Framework preset | Next.js (détecté) · Node.js **22.x** |
| Install / Build | `pnpm install --frozen-lockfile` · `pnpm build` (défauts) |
| Région des fonctions | `lhr1` (Londres, proche du staging) |
| Production Branch | `main`, **sans domaine de production ni promotion** ; aucun usage « Production » en Phase 1 |
| Deployment Protection | **Vercel Authentication** sur les Previews (« Standard Protection ») |
| Git → Fork Protection | **activée** (dépôt public : aucune Preview automatique pour les PR externes) |
| Protection Bypass for Automation | générer un secret, stocké uniquement dans GitHub (`VERCEL_AUTOMATION_BYPASS_SECRET`) pour les tests automatisés |

## 2. Domaine Preview stable
- Branche dédiée **`preview`** (créée à partir de `main` au moment du GO).
- Alias Vercel automatique de branche : `cpc-v2-web-git-preview-<équipe>.vercel.app`. Il est stable tant que la branche existe ; la valeur exacte s'affiche dans Vercel après le premier déploiement.
- `NEXT_PUBLIC_SITE_URL` = cet alias en `https://`. Indispensable : il sert de `redirectTo` (confirmation d'email, réinitialisation de mot de passe) et décide de l'attribut `Secure` des cookies.
- Domaine personnalisé : plus tard (dépend de D-18).

## 3. Variables d'environnement (scope **Preview** uniquement, branche `preview`)
| Variable | Valeur | Remarque |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cglbsllwdmluvbisozyx.supabase.co` | staging uniquement |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé publishable du staging (`sb_publishable_…`) | publique par nature, saisie dans Vercel, pas dans Git |
| `NEXT_PUBLIC_SITE_URL` | `https://cpc-v2-web-git-preview-<équipe>.vercel.app` | §2 |
| `MEDIA_SIGNED_URL_TTL` | `600` | ADR-0015 (plafond 900) |
| `ENABLE_AUTH_SPIKE` | `1` pendant la campagne, puis retiré | page `/spike/session` (tests A5, C-2) |
| Sentry (`SENTRY_*`, `NEXT_PUBLIC_SENTRY_*`) | **non définies** | ADR-0012 : désactivé |
| Clé secrète Supabase | **jamais** | aucun code applicatif ne l'utilise |

## 4. PWA sur iPhone
| Élément | État |
|---|---|
| `manifest.webmanifest` | `display: standalone`, `start_url: /home`, `scope: /`, portrait, icônes 192/512 + *maskable* ✅ |
| `apple-touch-icon` 180 px, `apple-mobile-web-app-capable`, titre court « CPC » | ✅ |
| Barre d'état `black-translucent` + **`viewport-fit=cover`** | ajouté par cette PR : sans lui, les encoches ne sont pas compensées en mode plein écran |
| Encoches / Dynamic Island / barre d'accueil | `env(safe-area-inset-top/bottom)` sur l'en-tête et la barre d'onglets ✅ |
| Champs ≥ 16 px sur écran tactile | ✅ (pas de zoom automatique, S-1.10) |
| Service worker | **aucun** (D-08 non validé ; pas de cache de données privées) |

**Limite iOS à vérifier sur appareil :** une app ajoutée à l'écran d'accueil a son propre stockage. La session Vercel Authentication de Safari n'y est pas reprise : au premier lancement de la PWA, iOS peut redemander l'accès Vercel, puis la connexion CPC. Si c'est bloquant pour la démonstration, un **lien partageable Vercel** temporaire peut être utilisé pendant la campagne (à décider).

## 5. Rapport d'impact P-1 (Auth Supabase)
Voir `docs/19_P1_IMPACT_REDIRECTIONS_AUTH.md`. Autorisation distincte requise.

## 6. Plan de tests
### 6.1 HTTP réel sur le staging — **exécutable sans Vercel**
Workflow manuel `staging-http` (`.github/workflows/staging-http.yml`), tests `tests/staging/` :
| ID | Contrôle | Condition G2 couverte |
|---|---|---|
| H1 | anonyme : RPC `api` 401/403, `account_settings` refusé, `rls_auto_enable` refusé | contrôles HTTP sur le staging |
| H2 | schéma `private` jamais exposé | idem |
| H3 | isolation A/B : lecture de ses seuls paramètres, IDOR profil et paramètres = 0 ligne, pas d'insertion directe, pseudo non modifiable | idem |
| H4 | `complete_onboarding` via HTTP : déjà onboardé → `ALREADY_HANDLED` | idem |
| H5 | D-40 réel : action sensible `true`, puis refusée juste après une déconnexion globale, JWT encore valide | idem |
| ST1–ST6 | Storage entre utilisateurs : dépôt propriétaire, écriture/remplacement/suppression par autrui refusés (S5), SVG et nom non conforme refusés (S7), anonyme refusé (S1), URL signée qui expire (S4), objet supprimé → URL refusée (S8) | **tests Storage entre utilisateurs sur le staging** |

Prérequis : 2 comptes synthétiques confirmés et onboardés (`qa_*@example.test`), mots de passe générés aléatoirement, puis les 6 secrets GitHub.

**Accès aux secrets limité aux exécutions de confiance :**
- secrets stockés dans l'**environnement GitHub `staging-qa`** (pas au niveau du dépôt), avec *Deployment branches* = `main` uniquement ;
- workflow déclenché **uniquement à la main** (`workflow_dispatch` : droits d'écriture requis), garde-fou `GITHUB_REF = refs/heads/main` et garde-fou sur l'URL du staging ;
- `permissions: contents: read` ; aucun workflow `pull_request_target` dans le dépôt ;
- les workflows de PR provenant de forks ne reçoivent jamais de secrets (règle GitHub) ; vérifier en plus *Settings → Actions → Fork pull request workflows* = approbation requise ;
- GitHub masque automatiquement les valeurs des secrets dans les journaux ; les tests n'affichent ni jeton, ni mot de passe, ni email. Aucune donnée réelle ; les objets Storage créés sont supprimés en fin de test.

### 6.2 Preview sur iPhone (après création du projet)
| ID | Scénario (Safari iOS, puis PWA installée) |
|---|---|
| M1 | Accès protégé : Vercel Authentication demandée, puis page publique en HTTPS, CSP avec `upgrade-insecure-requests` |
| M2 | Inscription d'un compte qa (si D-18 / SMTP le permet, sinon connexion d'un compte qa pré-créé) |
| M3 | Onboarding complet, puis Accueil |
| M4 | Navigation 3 onglets au pouce : cibles, retour, barre d'onglets au-dessus de la barre d'accueil iOS |
| M5 | Profil : présentation, gamertag, **avatar depuis la pellicule** (HEIC refusé proprement, PNG/JPEG acceptés) |
| M6 | Mode avion → bandeau hors ligne, puis retour réseau |
| M7 | « Ajouter à l'écran d'accueil » → lancement plein écran, encoche compensée, icône correcte |
| M8 | Déconnexion globale depuis un ordinateur → l'iPhone est refusé sur l'action sensible (A5b réel) |
| M9 | VoiceOver : ordre de lecture et libellés des onglets et formulaires |
| M10 | Réinitialisation de mot de passe (dépend de D-18) |

Résultats consignés dans un rapport de campagne, avec captures et version iOS.

## 7. Conditions G2 (rappel, HOLD)
| Condition | Moyen | État |
|---|---|---|
| Preview testée réellement | §6.2 | NON EXÉCUTÉ |
| Contrôles HTTP sur le staging | §6.1 H1–H5 | **préparé**, NON EXÉCUTÉ |
| Google OAuth A6 | client Google + fournisseur Supabase (configuration Auth) | NON EXÉCUTÉ, sauf décision modifiant les critères |
| Storage entre utilisateurs sur le staging | §6.1 ST1–ST6 | **préparé**, NON EXÉCUTÉ |
