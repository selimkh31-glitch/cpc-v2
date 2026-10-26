# CPC V2 — 17 · Plan de la première Preview Vercel (aucun déploiement à ce stade)

**Statut :** PLAN. Rien n'est créé ni déployé. Le projet Vercel est créé par Selim (règle de Phase 1) ; chaque étape marquée 🔐 demande une autorisation distincte.

## 1. Objectif
Disposer d'un environnement HTTPS relié au **staging** `cglbsllwdmluvbisozyx` pour exécuter ce que la CI locale ne peut pas couvrir :
- tests HTTP de C-1 (anonyme refusé, isolation, révocation, `complete_onboarding`) ;
- tests C-2 préparés (`tests/preview/c2-jwt-compat.spec.ts`), après autorisation de C-2 ;
- A6 Google (après configuration OAuth) ;
- démonstration de la Gate G2 (navigation, états, profil, accessibilité, PWA).

## 2. Projet Vercel (action Selim 🔐)
| Réglage | Valeur proposée |
|---|---|
| Nom | `cpc-v2-web` (aucun des 7 noms V1 exclus par ADR-0016 : `cpc`, `cpc-v1kt`, `cpclanding`, `cpcp-ed8e`, `cpc-admin`, `cpc-admin-mmjb`, `cpc-web-beta`) |
| Dépôt | `selimkh31-glitch/cpc-v2`, branche de production = **aucune promotion** en Phase 1 (Previews seulement) |
| Framework / Node / gestionnaire | Next.js · Node 22 · pnpm (`pnpm install --frozen-lockfile`, `pnpm build`) |
| Région des fonctions | `lhr1` (Londres, proche du staging eu-west-2) |
| Protection | **Vercel Authentication activée sur les Previews** (accès réservé) ; dépôt public ⇒ Previews de PR externes à désactiver |
| Production | **désactivée** (aucun domaine de production, aucune promotion) |

## 3. Variables d'environnement (portée « Preview » uniquement)
| Variable | Valeur | Secret ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cglbsllwdmluvbisozyx.supabase.co` | non |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé publishable du staging (`get_publishable_keys`) | non, mais saisie dans Vercel, pas dans Git |
| `NEXT_PUBLIC_SITE_URL` | URL **stable** de la Preview (alias de branche, ex. `cpc-v2-web-git-preview-<équipe>.vercel.app`) | non |
| `ENABLE_AUTH_SPIKE` | `1` (page `/spike/session` pour les tests C-2), à retirer ensuite | non |
| `MEDIA_SIGNED_URL_TTL` | `600` | non |
| Sentry (`SENTRY_ENABLED`, DSN…) | **non défini** (ADR-0012 : désactivé) | — |
| Clé secrète Supabase | **jamais** (aucun code ne l'utilise en Phase 1) | — |

## 4. Prérequis côté Supabase staging
| # | Élément | Nature | Autorisation |
|---|---|---|---|
| P-1 | Auth → URL Configuration : *Site URL* = alias stable de la Preview ; *Redirect URLs* += `https://<alias>/auth/callback` | **configuration Auth** | 🔐 rapport d'impact + autorisation distincte (règle D-40) |
| P-2 | Emails d'auth (inscription, réinitialisation) vers des adresses qa | SMTP par défaut limité aux membres de l'équipe ; Resend **bloqué par D-18** (domaine) | 🔐 D-18 ; en attendant, comptes qa créés confirmés (SQL ou admin) |
| P-3 | Migrations A-2 et A-1 (#17, #13) appliquées | migrations | 🔐 voir `docs/16` §5 |
| P-4 | Google OAuth (A6) : client Google Cloud + fournisseur activé dans Supabase | configuration Auth | 🔐 plus tard, avec D-05 |
| P-5 | C-2 (JWT 900 s) | configuration Auth | ⏸ HOLD |

## 5. Comptes de test
- 2 à 3 comptes **synthétiques** `qa_*@example.test` sur le staging, confirmés sans email (création par l'API admin ou SQL, documentée).
- Identifiants uniquement dans les **secrets GitHub** (`E2E_PREVIEW_EMAIL`, `E2E_PREVIEW_PASSWORD`, `E2E_BASE_URL`) : jamais dans Git ni dans les journaux.
- Suppression des comptes à la fin de chaque campagne.

## 6. Campagne de tests sur la Preview
| Lot | Tests | Prérequis |
|---|---|---|
| T-1 smoke | pages publiques, CSP à nonce en HTTPS (`upgrade-insecure-requests` présent), en-têtes de sécurité, manifest PWA | projet + variables |
| T-2 C-1 HTTP | `POST /rest/v1/rpc/assert_session_active` : anonyme → 401/403, authentifié → `true` ; deux utilisateurs : lectures et écritures croisées refusées ; `complete_onboarding` nominal, rejeu idempotent, pseudo pris | P-1, comptes qa |
| T-3 parcours | connexion, onboarding, navigation 3 onglets, profil, avatar (après A-1), accessibilité axe | P-1, P-3 |
| T-4 révocation | déconnexion globale depuis un 2ᵉ navigateur → action sensible refusée immédiatement (A5b réel) | P-1 |
| T-5 C-2 | `tests/preview/c2-jwt-compat.spec.ts` | P-5 autorisé |
| T-6 A6 Google | retour OAuth | P-4 |

Exécution : job GitHub Actions dédié, déclenché à la main, utilisant les secrets ; résultats publiés en annotations (même méthode que la CI actuelle).

## 7. Séquence proposée
1. Selim : GO fusions (#17, chaîne #11→#14, #15, #18, #16, #19) puis autorisations A-2 et A-1.
2. Claude : rapport d'impact P-1 (URL de redirection), soumis à autorisation.
3. Selim : création du projet Vercel (§2), variables (§3), protection des Previews.
4. Claude : PR « workflow Preview » (job manuel + secrets), sans déclenchement.
5. Selim : secrets GitHub, comptes qa ; GO campagne T-1 à T-4.
6. Rapport de campagne ; C-2 et A6 restent soumis à leurs propres décisions.

## 8. Risques
- Dépôt public : les Previews doivent rester protégées ; aucune Preview pour les PR de forks.
- `NEXT_PUBLIC_SITE_URL` doit être stable, sinon les liens de réinitialisation et la redirection OAuth pointent vers une URL fausse.
- Le staging devient joignable depuis une application déployée : les tests ne doivent créer que des données qa, supprimées ensuite.
