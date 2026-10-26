# CPC V2 — 19 · Rapport d'impact P-1 : redirections Supabase Auth pour la Preview

**Statut :** proposé. **Aucune modification appliquée.** Configuration Auth ⇒ autorisation distincte (règle D-40).
**Projet :** staging `cglbsllwdmluvbisozyx` uniquement (Dashboard → Authentication → URL Configuration).

## 1. Pourquoi
Les liens envoyés par email (confirmation d'inscription, réinitialisation) et le futur retour OAuth Google renvoient vers `redirectTo` = `NEXT_PUBLIC_SITE_URL + /auth/callback?next=…`. Supabase **n'accepte** une URL de redirection que si elle figure dans la liste autorisée. Sinon, il redirige vers la *Site URL*, aujourd'hui sans doute `http://localhost:3000` : le lien d'un email reçu sur iPhone serait alors inutilisable.

## 2. Changement proposé
| Réglage | Valeur actuelle | Valeur proposée |
|---|---|---|
| Site URL | à relever dans le tableau de bord (non lisible par les connecteurs ; défaut probable `http://localhost:3000`) | `https://cpc-v2-web-git-preview-<équipe>.vercel.app` |
| Redirect URLs (ajout) | à relever | `https://cpc-v2-web-git-preview-<équipe>.vercel.app/auth/callback` (URL **exacte**, sans joker) |
| Redirect URLs (conservée) | — | `http://localhost:3000/auth/callback` (développement local) |

**Volontairement exclus :** les jokers `https://*.vercel.app/**` ou `*-<équipe>.vercel.app/**`. N'importe quel déploiement, y compris d'une PR externe sur un dépôt public, pourrait sinon recevoir des jetons d'authentification.

## 3. Impact
| Domaine | Effet |
|---|---|
| Sécurité | Une seule origine HTTPS ajoutée, protégée par Vercel Authentication ; aucun joker. Le code n'accepte que des chemins internes (`safeNextPath`) et le flux PKCE impose le *code verifier* du même navigateur. |
| Emails | Les modèles utilisant `{{ .SiteURL }}` pointeront vers la Preview. L'envoi à des adresses tierces reste limité par le SMTP par défaut (**D-18** non tranché) : seuls les tests avec comptes pré-créés sont garantis. |
| Développement local | Inchangé (URL locale conservée dans la liste). |
| Production | Aucune (pas de projet de production). |
| JWT / C-2 | **Aucun changement** de durée ni d'autre réglage Auth. |
| Google OAuth (A6) | Prérequis partiel : l'URL de rappel Supabase et le client Google restent à configurer (décision séparée). |

## 4. Procédure (le jour du GO)
1. Relever et consigner les valeurs actuelles (capture du tableau de bord).
2. Saisir *Site URL* et ajouter la *Redirect URL* exacte.
3. Vérifier : réinitialisation de mot de passe d'un compte qa → le lien reçu pointe vers la Preview et ouvre `/reset-password` (M10) ; une redirection vers une URL hors liste est refusée.
4. Consigner le résultat dans le rapport de campagne.

## 5. Retour arrière
Remettre la *Site URL* et la liste des *Redirect URLs* aux valeurs relevées à l'étape 1. Effet immédiat ; aucun impact sur les données.

## 6. Décision demandée
| ID | Demande | Recommandation |
|---|---|---|
| P-1 | Autoriser Site URL = alias Preview + Redirect URL exacte `…/auth/callback` sur le staging | **GO** au moment de la création du projet Vercel ; jamais de joker |
