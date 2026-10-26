# CPC V2 — 19 · Rapport d'impact P-1 : redirections Supabase Auth pour la Preview

**Statut :** autorisé par Selim et appliqué manuellement le 26/10/2026 ; **révisé le 26/10/2026 après l'incident QA iPhone** (`docs/21`, A-6). Configuration Auth ⇒ toute nouvelle modification exige une autorisation distincte (règle D-40).
**Projet :** staging `cglbsllwdmluvbisozyx` uniquement (Dashboard → Authentication → URL Configuration).

## 1. Pourquoi
Les liens envoyés par email (confirmation d'inscription, réinitialisation) et le futur retour OAuth Google renvoient vers le `redirectTo` construit par l'application :

| Parcours | `redirectTo` envoyé (`src/features/auth/actions.ts`) |
|---|---|
| Inscription | `NEXT_PUBLIC_SITE_URL + /auth/callback?next=<chemin encodé>` (ex. `?next=%2Fhome`) |
| Mot de passe oublié | `NEXT_PUBLIC_SITE_URL + /auth/callback?next=%2Freset-password` |

Si Supabase refuse ce `redirectTo`, il **retombe silencieusement sur la *Site URL***. C'est ce qui s'est produit le 26/10 : lien email → `http://localhost:3000/?code=…`, inaccessible depuis l'iPhone.

## 2. Comportement vérifié de Supabase Auth
Sources : documentation [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls) et code de validation de Supabase Auth (`IsRedirectURLValid`, cité dans [supabase/auth#708](https://github.com/supabase/auth/issues/708)).

1. **Même hôte que la *Site URL* ⇒ accepté**, avant toute consultation de la liste (`base.Hostname() == refurl.Hostname()`).
2. Sinon, la liste *Redirect URLs* est consultée : une entrée **sans joker** n'est acceptée qu'en **égalité stricte de la chaîne entière, paramètres compris**. `https://<alias>/auth/callback` **ne correspond pas** à `https://<alias>/auth/callback?next=%2Fhome`.
3. Une entrée avec joker est un motif *glob* (`*`, `**`, `?` : `?` y est un joker, pas le début des paramètres).

**Conséquence :** l'entrée exacte proposée initialement était inopérante pour nos liens (ils portent toujours `?next=…`). Ce qui rend les liens fonctionnels est la ***Site URL* = alias Preview** (règle 1). Erreur du rapport initial, corrigée ici.

**Vérification réelle :** NON EXÉCUTÉE à ce jour (aucun email ne peut être reçu sur une adresse `qa_*@example.test` tant que D-18 n'est pas tranché). Elle est prévue en M2/M10 (`docs/21` §5).

## 3. Configuration cible (sans joker)
| Réglage | Valeur |
|---|---|
| Site URL | `https://cpc-v2-web-git-preview-selimkh31-4924s-projects.vercel.app` (sans `/` final) — **c'est ce réglage qui autorise nos liens** |
| Redirect URLs | `https://cpc-v2-web-git-preview-selimkh31-4924s-projects.vercel.app/auth/callback` (inoffensive, utile si un parcours sans `?next` est ajouté) ; `http://localhost:3000/auth/callback` (voir §4) |

**Toujours exclus :** les jokers `https://*.vercel.app/**` ou `*-<équipe>.vercel.app/**` : n'importe quel déploiement, y compris d'une PR externe sur un dépôt public, pourrait recevoir des jetons. Un joker restreint à l'alias (`https://<alias>/auth/callback**`) n'apporte rien tant que la *Site URL* est l'alias (même hôte) : il n'est pas nécessaire.

## 4. Impact
| Domaine | Effet |
|---|---|
| Sécurité | Tout chemin de l'alias Preview est accepté comme retour (règle « même hôte ») : l'alias est protégé par Vercel Authentication ; le code n'accepte que des chemins internes (`safeNextPath`) ; le flux PKCE impose le *code verifier* du même navigateur. |
| Emails | Les modèles utilisant `{{ .SiteURL }}` pointent vers la Preview. Envoi limité par le SMTP par défaut (**D-18** non tranché). |
| Développement local | Le développement local utilise Supabase local (`supabase/config.toml` : `site_url` et `additional_redirect_urls` propres) : non affecté. Un serveur local branché sur le **staging** ne recevrait plus de liens email valides (`?next=…` ne correspond pas à l'entrée exacte localhost) : cas non utilisé. |
| Production / JWT / C-2 | Aucun changement. |
| Google OAuth (A6) | Le retour OAuth utilisera le même `redirectTo` ⇒ couvert par la *Site URL*. Configuration du fournisseur : décision séparée. |

## 5. Procédure de contrôle (Selim, Dashboard)
1. *Authentication → URL Configuration* : relever *Site URL* et *Redirect URLs*, capture d'écran.
2. Vérifier *Site URL* = alias exact ci-dessus, **Save** si modifié.
3. Consigner dans `docs/21`.

## 6. Retour arrière
*Site URL* = `http://localhost:3000`, *Redirect URLs* vide (valeurs relevées le 26/10 avant P-1). Effet immédiat ; aucune donnée touchée.
