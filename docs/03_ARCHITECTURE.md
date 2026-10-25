# CPC V2 — 03 · Architecture technique recommandée

Statut : **recommandation** à valider. Chaque choix renvoie à une ADR (index en §9). Les versions exactes seront épinglées au scaffold, sur la dernière version stable de chaque outil à cette date.

---

## 1. Principes directeurs

1. **Postgres est l'arbitre.** Toute transition métier critique est une fonction SQL transactionnelle, qui verrouille ses lignes et revérifie identité et rôle. L'UI ne fait que demander.
2. **Lectures simples directes, écritures sensibles par commandes.** Les lectures passent par PostgREST sous RLS. Les mutations sensibles passent par des RPC « commandes », jamais par des `INSERT`/`UPDATE` libres.
3. **Pas de service role dans les parcours utilisateurs.** La clé secrète Supabase n'est utilisée que par les webhooks (paiement) et quelques tâches système. Tout le reste s'exécute avec le JWT de l'utilisateur, donc `auth.uid()` et la RLS s'appliquent.
4. **Realtime = signal, jamais donnée.** Un événement transporte un type, des IDs et une révision. Le client refetch l'état canonique.
5. **Heure serveur partout.** Les lectures renvoient `server_now` ; le client calcule son décalage d'horloge pour afficher les comptes à rebours.
6. **Simplicité délibérée.** Pas d'ORM, pas de state manager global, pas de micro-services. Une app Next.js, un projet Supabase par environnement.

---

## 2. Topologie

```text
Navigateur (mobile d'abord)
  └─ Next.js (App Router) sur Vercel
       ├─ Server Components ── lectures RLS (JWT utilisateur)
       ├─ Server Actions ───── validation Zod → RPC api.* (JWT utilisateur)
       ├─ Route Handlers ───── /auth/callback, /api/webhooks/* (signés)
       └─ proxy.ts ─────────── rafraîchit la session, redirige vers le login (confort, pas sécurité)

Supabase (projet V2 neuf)
  ├─ Auth : email + mot de passe, confirmation email, Google (D-05) ; SMTP custom (D-17)
  ├─ Postgres
  │    ├─ public  : tables lisibles sous RLS (SELECT surtout)
  │    ├─ api     : fonctions-commandes et lectures complexes exposées en RPC
  │    └─ private : helpers d'autorisation, audit, staff, idempotence, billing, jobs (NON exposé)
  ├─ Realtime : Broadcast sur canaux privés autorisés par RLS (realtime.messages)
  ├─ pg_cron  : expirations toutes les minutes (Radar, LIVE, invitations, transferts)
  └─ Storage  : avatars, blasons
```

**Admin CPC** : groupe de routes `/admin` dans la même app. Le layout serveur vérifie le statut staff via `private.staff_members`, et toutes les RPC `api.staff_*` le revérifient. Sous-domaine dédié recommandé avant la production, pas nécessaire pour démarrer.

---

## 3. Stack recommandée

| Couche | Choix | Alternative écartée | ADR |
|---|---|---|---|
| Framework | **Next.js App Router**, React 19, TypeScript `strict` | Remix, SPA Vite (moins adaptés au SSR et à l'auth cookie) | 0001 |
| Runtime / gestionnaire | Node LTS actif, **pnpm** | npm (plus lent, lockfile moins strict) | 0001 |
| Styles | **Tailwind CSS v4** + design tokens (variables CSS) | CSS Modules | 0001 |
| Composants | **shadcn/ui (Radix)**, copiés dans le repo | MUI, Chakra (lourds, moins maîtrisables) | 0006 |
| Validation | **Zod** aux frontières (formulaires, actions, réponses RPC) | Valibot (équivalent, écosystème plus petit) | 0001 |
| Données client | Server Components pour les lectures ; **TanStack Query uniquement sur les écrans temps réel** (LIVE, notifications, messages) ; filtres dans l'URL (`searchParams`) | Redux, Zustand (inutiles ici) | 0007 |
| Accès DB | **supabase-js + types générés** (`supabase gen types`) ; migrations SQL via Supabase CLI | **Prisma (V1)** : contourne la RLS en connexion directe, ne gère ni policies ni fonctions | 0003 |
| Auth web | **@supabase/ssr**, PKCE, cookies par défaut de la lib (lisibles par le client navigateur, **pas httpOnly** : voir ADR-0002 v3), CSP stricte ; `getClaims()` pour les pages, `getUser()` pour les actions sensibles | Auth maison | 0002 |
| Temps réel | **Realtime Broadcast** déclenché par triggers DB, canaux privés | Postgres Changes (coûteux sous RLS, expose des lignes) | 0008 |
| Jobs | **pg_cron** (toutes les minutes, idempotent) | Vercel Cron (limité sur Hobby), Edge Functions (inutile pour du SQL pur) | 0009 |
| i18n | **next-intl**, FR seul au lancement (D-16) | Textes en dur | 0010 |
| Tests | **Vitest** (unitaires), **pgTAP** via `supabase test db` (RLS, commandes), **Playwright** (E2E mobile et desktop), scripts de course multi-connexions | Jest | 0011 |
| Observabilité | **Sentry optionnel** (activé seulement par variables d'environnement, no-op en local et en CI) + logs Vercel ; erreurs métier codées | — | 0012 |
| CI | **GitHub Actions** : lint, typecheck, Vitest, Supabase local + pgTAP, build, Playwright, scan de secrets (gitleaks), garde-fou anti-V1 | — | 0011 |
| Paiement (Phase 6) | Stripe ou MoR, décision D-07 | — | 0013 |

---

## 4. Modèle de mutation (ADR-0004)

```text
UI ─(formulaire)→ Server Action
    1. Zod parse l'entrée
    2. supabase.rpc('cmd_x', {..., p_request_id}) avec le JWT utilisateur
       └─ api.cmd_x  [SECURITY DEFINER, search_path = '']
            a. uid := auth.uid() ; refus si NULL ou compte supprimé/sanctionné
            b. idempotence : si p_request_id déjà traité → renvoie la réponse stockée
            c. SELECT … FOR UPDATE sur les lignes concernées (ordre de verrouillage fixe)
            d. contrôle d'autorisation (rôle actuel dans CE club) et des invariants
            e. écritures + événement d'audit + notification + broadcast
            f. renvoie {ok, data, server_now} ou lève une erreur codée
    3. Action → revalidatePath / renvoie l'état canonique ; l'UI affiche le succès seulement ici
```

- **Codes d'erreur stables** : `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION`, `EXPIRED`, `CONFLICT`, `ALREADY_HANDLED`, `LIMIT_REACHED`, `BLOCKED`, `CONSENT_REQUIRED`, `OWNER_MUST_TRANSFER`, `PRO_REQUIRED`, `RATE_LIMITED`, `SANCTIONED`.
- **Concurrence terrain** : `live_sessions.lineup_revision` sert de verrou optimiste. Chaque mutation envoie `expected_revision` ; si elle diffère, le serveur renvoie `CONFLICT` avec l'état actuel (T-05).
- **Ordre de verrouillage** (anti-deadlock) : club → session → adhésions/participants triés par id.
- **Rattrapage réseau** : le client réutilise le même `p_request_id` en cas de retry. Au retour en ligne : refetch puis réconciliation (T-07).
- **Écritures directes autorisées** uniquement sur des données strictement personnelles et sans invariant : champs éditables du profil, préférences, lecture des notifications. Encadrées par RLS et des `GRANT UPDATE (colonnes)` explicites.

---

## 5. Temps réel (ADR-0008)

| Canal (topic privé) | Qui peut s'abonner (policy sur `realtime.messages`) | Événements |
|---|---|---|
| `user:{uid}` | uid lui-même | notification créée, invitation reçue ou annulée, statut Radar, sanction |
| `live:{session_id}` | participants actifs + managers du club | participant entré/sorti, feuille modifiée (revision), demande reçue (managers), prolongation, fermeture/expiration |
| `club:{club_id}` | managers/OWNER du club | candidature reçue, invitation traitée, session lancée |

- Messages : `user:{uid}` porte « nouveau message dans la conversation X ». Le contenu est relu via RLS.
- À la déconnexion, au changement de club, en cas de blocage ou de droits révoqués : désabonnement côté client. Côté serveur, la policy refuse toute nouvelle souscription non autorisée.
- Pas d'« en ligne » inféré du WebSocket (ARCHI §7).

---

## 6. Échéances et jobs (ADR-0009)

- `pg_cron` toutes les minutes appelle `private.job_expire_all()`, idempotent : il clôt les Radar, sessions LIVE, demandes/invitations LIVE, invitations club, candidatures et transferts échus, et émet notifications et broadcasts.
- Toutes les lectures filtrent déjà par `expires_at > now()`, donc un retard du job ne montre jamais un état expiré comme actif (T-06, T-16).
- Rappel T−10 min aux managers (LIV-11) émis par le même job.

---

## 7. Sécurité

- **Cookies de session** : lisibles par le client navigateur (requis par @supabase/ssr), d'où une CSP stricte et l'interdiction de `dangerouslySetInnerHTML` (ADR-0002).
- **Clés** : clé publishable côté navigateur ; clé secrète uniquement dans les Route Handlers de webhook et le code marqué `server-only` ; jamais dans `NEXT_PUBLIC_*`.
- **Admin** : rôle staff lu dans `private.staff_members`, jamais dans `user_metadata` (modifiable par l'utilisateur).
- **RLS** : activée sur 100 % des tables exposées ; `REVOKE ALL` par défaut sur `anon` et `authenticated`, puis `GRANT` explicites. Fonctions `api.*` : `REVOKE EXECUTE FROM public, anon`, `GRANT` à `authenticated`.
- **Headers** : CSP stricte, `frame-ancestors 'none'`, `Referrer-Policy`, HSTS.
- **CSRF** : les Server Actions vérifient l'Origin. Les Route Handlers mutants n'acceptent que du POST, avec des tokens signés pour les webhooks.
- **Garde-fou V1 en CI** : le build échoue si la ref `cfgvtyxiggewauevvigm` ou une URL V1 apparaît dans le repo ou l'environnement.
- **Rate limiting** : compteurs dans `private.rate_limits`, appliqués dans les commandes (Radar, invitations, messages, signalements).

---

## 8. Environnements

| Env | Supabase | Vercel | Données |
|---|---|---|---|
| Local | `supabase start` (Docker) | `next dev` | seed synthétique |
| CI | Supabase local dans GitHub Actions | build | seed synthétique |
| Staging / Preview | projet V2 **staging** (créé maintenant) | Preview, protégé par mot de passe | synthétique uniquement |
| Production | projet V2 **prod** séparé, plan Pro (Phase 7) | Production, Vercel Pro | réelles, après validation des CGU et de la confidentialité |

---

## 9. Index des ADR (à rédiger en Phase 0, une page chacune)

| ADR | Sujet | Décision proposée |
|---|---|---|
| 0001 | Stack applicative | Next.js App Router, TS strict, Tailwind v4, Zod, pnpm |
| 0002 | Frontière d'authentification | @supabase/ssr, PKCE, revérification serveur dans chaque action ; proxy = confort |
| 0003 | Frontière Supabase | Pas d'ORM ; schémas `public`/`api`/`private` ; migrations SQL CLI ; types générés |
| 0004 | Modèle de mutation | Commandes SECURITY DEFINER dans `api`, idempotence, verrous, codes d'erreur |
| 0005 | Convention de routes | Anglais, pluriel (`/clubs/[clubId]`), `/home` canonique, `/admin` isolé |
| 0006 | Composants UI | shadcn/ui (Radix) + tokens, accessibilité AA |
| 0007 | État client | RSC + URL state ; TanStack Query limité aux écrans temps réel |
| 0008 | Temps réel | Broadcast privé via triggers, payload minimal, refetch |
| 0009 | Jobs et TTL | pg_cron chaque minute + filtrage `expires_at` dans les lectures |
| 0010 | i18n | next-intl, FR seul au lancement |
| 0011 | Stratégie de test et CI | Vitest, pgTAP, Playwright, courses multi-connexions, gitleaks, garde-fou V1 |
| 0012 | Observabilité | Sentry optionnel, non bloquant + codes d'erreur métier |
| 0013 | Paiement Pro | À décider (D-07), en Phase 6 |
| 0014 | Provider EA | Interface `EAProvider`, implémentation `Unavailable` par défaut |
| 0015 | Stockage médias | Buckets privés, URL signées de 10 min générées côté serveur |
