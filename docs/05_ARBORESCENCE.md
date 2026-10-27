# CPC V2 — 05 · Arborescence du nouveau projet

Nouveau dépôt GitHub (nom suggéré : `cpc-v2`), **sans aucun fichier copié de V1**. Les noms de routes suivent ADR-0005.

```text
cpc-v2/
├─ src/
│  ├─ app/
│  │  ├─ dev/ui/page.tsx              # galerie du design system (P2-A) : notFound() hors ENABLE_UI_GALLERY=1, jamais sur Vercel
│  │  ├─ (public)/                    # accessible sans compte
│  │  │  ├─ page.tsx                  # accueil public → /login ou /home si connecté
│  │  │  ├─ legal/{terms,privacy,support}/
│  │  ├─ (auth)/
│  │  │  ├─ login/  signup/  forgot-password/  reset-password/  verify-email/
│  │  │  └─ onboarding/               # pseudo, plateforme, postes, âge (AUTH-03)
│  │  ├─ auth/callback/route.ts       # échange de code PKCE (email + OAuth)
│  │  ├─ (app)/                       # shell authentifié : header (Radar, messages, notifications) + 3 onglets
│  │  │  ├─ layout.tsx                # vérifie la session + l'onboarding côté serveur
│  │  │  ├─ home/                     # Accueil contextuel (ACC-01..04)
│  │  │  ├─ explore/
│  │  │  │  ├─ play/                  # sessions ouvertes (EXP-03)
│  │  │  │  ├─ clubs/                 # adhésion (EXP-04)
│  │  │  │  └─ players/               # managers autorisés (EXP-05)
│  │  │  ├─ profile/                  # profil perso, Mes invitations, Mes clubs
│  │  │  │  └─ invitations/
│  │  │  ├─ clubs/
│  │  │  │  ├─ new/
│  │  │  │  └─ [clubId]/
│  │  │  │     ├─ page.tsx            # fiche club + effectif (CLB-04/05)
│  │  │  │     └─ manage/             # candidatures, invitations, membres, rôles, paramètres, LIVE
│  │  │  ├─ live/[sessionId]/         # terrain + banc + file de demandes
│  │  │  ├─ players/[playerId]/
│  │  │  ├─ messages/  messages/[conversationId]/
│  │  │  ├─ notifications/
│  │  │  └─ settings/  settings/account/   # suppression de compte (AUTH-04)
│  │  ├─ admin/                       # layout serveur : is_staff, sinon notFound()
│  │  │  ├─ reports/  cases/  sanctions/  appeals/
│  │  ├─ api/webhooks/billing/route.ts   # Phase 6 uniquement, signature vérifiée
│  │  ├─ manifest.webmanifest/route.ts # PWA (D-08) ; lien émis dans layout.tsx (crossorigin use-credentials)
│  │  └─ layout.tsx  error.tsx  not-found.tsx  global-error.tsx
│  ├─ components/
│  │  ├─ ui/                          # design system P2-A (docs/23) : Button/SubmitButton, IconButton, TextField, Chip, Badge, Avatar, Skeleton, EmptyState, InlineStatus, use-submit-lock, Sheet (<dialog> natif), SheetLauncher, ListSection/ListRow, LivePill/LiveHalo
│  │  ├─ layout/                      # AppShell, TabBar, Header, RadarIndicator, Sheet
│  │  └─ states/                      # Loading, Empty, Error, Offline, Expired, Forbidden, Conflict (UX-01)
│  ├─ features/                       # un dossier par domaine, même structure partout
│  │  ├─ auth/  profiles/  clubs/  memberships/  recruitment/
│  │  ├─ radar/  live/  lineup/  explore/  ea/
│  │  ├─ messaging/  notifications/  reviews/  safety/  pro/  admin/
│  │  │   └─ <domaine>/
│  │  │       ├─ components/          # UI du domaine
│  │  │       ├─ actions.ts           # Server Actions ('use server') → RPC api.*
│  │  │       ├─ queries.ts           # lectures serveur (server-only)
│  │  │       ├─ schemas.ts           # Zod (entrées/sorties)
│  │  │       ├─ hooks.ts             # client : realtime, TanStack Query (si écran temps réel)
│  │  │       └─ rules.ts             # règles pures testables (ex. AUTOFILL, priorités ACC-01)
│  ├─ lib/
│  │  ├─ supabase/
│  │  │  ├─ browser.ts                # client publishable
│  │  │  ├─ server.ts                 # client SSR cookies (JWT utilisateur)
│  │  │  └─ admin.ts                  # clé secrète — 'server-only', webhooks/système UNIQUEMENT
│  │  ├─ auth/                        # requireUser(), requireOnboarded(), requireStaff()
│  │  ├─ errors/                      # mapping codes RPC → messages UX
│  │  ├─ time/                        # décalage horloge serveur, comptes à rebours
│  │  ├─ realtime/                    # abonnement aux canaux privés, cycle de vie
│  │  ├─ idempotency/                 # génération et persistance des request_id
│  │  ├─ i18n/                        # next-intl (FR)
│  │  └─ observability/               # Sentry, logger
│  ├─ types/database.ts               # généré par `supabase gen types` (jamais édité à la main)
│  ├─ messages/fr.json                # textes UI
│  └─ proxy.ts                        # rafraîchissement session + redirections (pas de sécurité)
├─ supabase/
│  ├─ config.toml                     # projet local ; AUCUNE ref V1
│  ├─ migrations/                     # V2 uniquement, une migration par incrément
│  │  ├─ <ts>_00_extensions_schemas.sql
│  │  ├─ <ts>_01_identity.sql
│  │  ├─ <ts>_02_helpers_authz.sql
│  │  ├─ <ts>_10_clubs_memberships.sql …
│  ├─ tests/database/                 # pgTAP : rls_<table>.test.sql, cmd_<commande>.test.sql, invariants.test.sql
│  └─ seed.sql                        # personas et données 100 % synthétiques, préfixe « qa_ »
├─ tests/
│  ├─ unit/                           # Vitest : rules.ts, schemas, utils
│  ├─ race/                           # scripts multi-connexions T-05/06/07/09
│  └─ e2e/                            # Playwright : projets iPhone, Pixel, Desktop ; axe-core (a11y)
├─ docs/
│  ├─ PRODUCT_SPEC.md                 # copie figée de CPC_V2_PRODUCT_SPEC v1.0
│  ├─ ARCHITECTURE.md                 # 03
│  ├─ SCHEMA_RLS.md                   # 04 (= SECURITY_MATRIX)
│  ├─ DECISIONS.md                    # 02 registre consolidé, mis à jour à chaque arbitrage
│  ├─ ADR_INDEX.md
│  ├─ reference/CPC_Cahier_UX_V1_Reference.docx   # référence UX (V-09)
│  ├─ BACKLOG_V2.md                   # 06
│  ├─ AUDIT_PHASE2.md                 # 01
│  └─ ADR/0001-stack.md … 0016-v1-isolation.md
├─ .github/
│  ├─ workflows/ci.yml                # lint, typecheck, unit, supabase+pgTAP, build, e2e, gitleaks, garde-fou V1
│  └─ pull_request_template.md        # preuves exigées par gate
├─ scripts/
│  └─ check-no-v1.sh                  # échoue si une ref/URL V1 est détectée
├─ .env.example                       # noms de variables seulement, aucune valeur
├─ .gitignore                         # .env*, .vercel, supabase/.temp
├─ CLAUDE.md                          # règles projet pour Claude Code (interdits V1, gates, conventions)
├─ package.json  pnpm-lock.yaml  tsconfig.json  eslint.config.mjs  vitest.config.ts  playwright.config.ts
└─ next.config.ts                     # headers de sécurité (CSP, HSTS…)
```

**Conventions**
- Un domaine n'importe jamais les `actions.ts` ou `queries.ts` d'un autre domaine. Les dépendances transverses passent par `lib/`.
- `lib/supabase/admin.ts` est importable uniquement depuis `app/api/webhooks/*`, avec une règle ESLint `no-restricted-imports`.
- Commits en français, un lot par PR, preuves de gate dans la description.
