# ADR-0002 — Frontière d'authentification

- **Statut :** 🟡 VALIDÉ SOUS RÉSERVE. Revue v3 favorable (Selim, 25/10 22:02). **Réserve maintenue** : levée uniquement après exécution **intégrale** de A1–A8, avec preuves (sorties Playwright/CI jointes). Aucun scénario déclaré PASS sans exécution.
- **Date :** 25/10/2026 · **Révision :** v3 (corrige v2, qui affirmait à tort des cookies httpOnly)

## Contexte et vérification
La v2 prévoyait des cookies `httpOnly`. **Vérification faite dans la documentation officielle Supabase** (*Advanced guide* et *Creating a client for SSR*, consultées le 25/10/2026) :
- Le client navigateur (`createBrowserClient`) doit **lire** l'access token et le refresh token pour maintenir la session, rafraîchir le token et authentifier les canaux Realtime privés. La doc indique que le flag HttpOnly « n'est pas nécessaire » pour ce schéma, et le client navigateur ne fonctionnerait pas si les cookies lui étaient illisibles.
- Côté serveur, le rafraîchissement écrit les nouveaux tokens via `Set-Cookie` dans `proxy.ts` (Next.js 16 ; `middleware.ts` en ≤ 15).
- `getClaims()` vérifie la signature du JWT (en local avec les clés asymétriques par défaut des nouveaux projets) ; `getUser()` interroge le serveur Auth et détecte une session révoquée ailleurs ; `getSession()` côté serveur ne doit jamais servir à autoriser.
- Une réponse portant un `Set-Cookie` de session mise en cache (ISR, CDN) peut connecter un utilisateur sous l'identité d'un autre.

**Conclusion : on ne force pas `httpOnly`. On garde la configuration de cookies par défaut de la version épinglée de `@supabase/ssr`**, et on compense le risque XSS par d'autres mesures.

## Décision
1. **Clients** : `createBrowserClient` (composants client), `createServerClient` (Server Components, Server Actions, Route Handlers) avec les callbacks `getAll`/`setAll` ; un client par requête, jamais partagé entre requêtes.
2. **Cookies** : options par défaut de `@supabase/ssr` (lisibles par le JS du domaine). `Secure` en Preview et en prod, `SameSite=Lax`, aucune durée de vie raccourcie artificiellement. Les options exactes **ne sont pas présumées** : elles sont relevées sur la version épinglée au scaffold et consignées dans cet ADR (S-1.4a).
3. **Proxy** : `proxy.ts` appelle `updateSession`, renvoie **l'objet réponse construit par `setAll`** (ou recopie ses cookies et en-têtes de cache), et n'exécute aucune logique entre la création du client et l'appel à `getClaims()`. Le proxy sert au confort (rafraîchissement, redirection), pas à la sécurité.
4. **Autorisation** :
   - pages et lectures privées : `getClaims()` ;
   - Server Actions sensibles, admin, suppression de compte : `getUser()` (session révoquée détectée) ;
   - l'autorisation métier est toujours revérifiée en base (ADR-0004) ;
   - `getSession()` est interdit pour autoriser côté serveur (règle ESLint).
5. **Cache** : `Cache-Control: private, no-store` sur toutes les routes authentifiées ; aucune page privée en ISR ou mise en cache CDN.
6. **Compensation XSS** (les tokens étant lisibles par le JS) : CSP stricte avec nonces, interdiction de `dangerouslySetInnerHTML` (ESLint), aucun script tiers hors liste blanche, contenus utilisateurs toujours échappés, dépendances scannées. Access token à durée courte (défaut Supabase) et révocation via `getUser()` sur les actions sensibles.
7. **Fournisseurs** : email + mot de passe avec confirmation, et Google (D-05 ✅). Apple ⏸. Redirections post-login : chemins internes relatifs uniquement ; URL OAuth en liste blanche dans Supabase.
8. **Réauthentification récente** pour la suppression de compte et le changement d'email.
9. **Âge** : déclaration avec seuil configurable `AGE_MIN = 18`, étiqueté TEMPORAIRE (D-12 🟠).

## Spike de validation S-1.4a (préalable à la levée de la réserve)
Tests Playwright sur Supabase local, avec la version exacte épinglée :
| # | Scénario | Attendu |
|---|---|---|
| A1 | Access token expiré, navigation serveur | `proxy.ts` rafraîchit, la page s'affiche, nouveaux cookies posés |
| A2 | Access token expiré, action côté client | le client navigateur rafraîchit sans déconnexion |
| A3 | Deux onglets rafraîchissent simultanément | aucune déconnexion (pas de refresh token réutilisé en erreur) |
| A4 | Abonnement Realtime privé après rafraîchissement | le canal reste autorisé avec le nouveau token |
| A5 | Déconnexion sur un autre appareil | action sensible refusée (`getUser()`) |
| A6 | Retour OAuth Google et confirmation d'email (PKCE) | session établie, redirection interne |
| A7 | En-têtes des routes privées | `Cache-Control: private, no-store`, aucun `Set-Cookie` en cache |
| A8 | Relevé des attributs réels des cookies | consigné dans cet ADR |

## Conséquences
Le risque XSS est le risque principal et il est traité explicitement. Si le spike révèle un flux incompatible avec la version retenue, l'ADR repasse en revue avant toute suite.

Sources : [Advanced guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) · [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
