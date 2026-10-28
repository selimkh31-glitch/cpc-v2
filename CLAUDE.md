# CPC V2 — Règles projet (Claude Code)

## Périmètre autorisé
- Repo : `selimkh31-glitch/cpc-v2` uniquement.
- Supabase : **staging `cglbsllwdmluvbisozyx` uniquement**, via le connecteur `supabase-cpc-v2-write` (écriture) ou `supabase-cpc-v2` (lecture). Avant chaque `apply_migration`, `get_project_url` doit renvoyer `https://cglbsllwdmluvbisozyx.supabase.co`.
- Phase 1 (S-1.1 → S-1.12) : livrée, statut officiel **G2 HOLD** (`docs/21`).
- Phase 2 produit : **P2-A livré** (design system « Stade de nuit », #28–#31, #33). **P2-B « Explorer Clubs »** (`docs/25`, contrat `docs/26`) : seul le sous-lot **B0** (contrats, sans migration) est autorisé (GO Selim du 28/10/2026). **B1 à B7 exigent chacun un GO d'exécution** ; aucune migration appliquée au staging sans GO spécifique. Radar et LIVE non démarrés.

## Interdits absolus
- CPC V1 : repo `CPC`, `CPCP`, `Cpclanding`, `clubpro-match` ; Supabase `cfgvtyxiggewauevvigm` ; projets Vercel `cpc`, `cpc-v1kt`, `cpclanding`, `cpcp-ed8e`, `cpc-admin`, `cpc-admin-mmjb`, `cpc-web-beta`. Aucune écriture, aucune réutilisation de secrets, d'URL ou de données.
- Connecteur claude.ai `Supabase` (organisation COMMAND DIRECT) : **jamais appelé** dans ce projet.
- Aucune donnée réelle, aucun secret dans Git (seed 100 % synthétique : `qa_*@example.test`).
- Ne jamais supprimer `public.rls_auto_enable()` ni l'event trigger `ensure_rls` (D-38).
- Aucun déploiement de production.

## Méthode
- Développement exclusivement par PR (D-37, D-39) ; Selim valide et fusionne.
- Migrations : fichiers `supabase/migrations/` = source ; testées en CI ; appliquées au staging **après fusion** via `apply_migration`, puis `list_migrations` + `get_advisors` (D-35).
- Après chaque `apply_migration` : aligner le nom du fichier sur la version enregistrée par le staging, et rejouer les requêtes d'invariants (P2/R2/R3) **sur le staging** en lecture seule (la CI ne voit pas les objets de plateforme comme `rls_auto_enable()`).
- Chaque commande SQL `api.*` respecte la Definition of Done d'ADR-0004 (R1 autorisation, R2 EXECUTE, R3 search_path, R4 abus).
- Inventaire des tests ADR-0011 (P1–P10, C1–C11) : ni suppression ni désactivation sans ADR et accord de Selim.
- **Règle de preuve** : un test déclaré réussi est accompagné de sa sortie d'exécution (CI ou journal). Un test non lancé est « NON EXÉCUTÉ ».
- Chaque PR documente : tests exécutés (avec preuves), risques résiduels, actions manuelles nécessaires.

## Conventions
- Commits et PR en français.
- Next.js App Router, TypeScript strict, Tailwind v4, Zod, next-intl (FR), shadcn/ui, Supabase (`@supabase/ssr`), pnpm.
- Routes : ADR-0005. Arborescence : `docs/05_ARBORESCENCE.md`.
- `getSession()` interdit pour autoriser côté serveur ; `dangerouslySetInnerHTML` interdit ; `src/lib/supabase/admin.ts` importable uniquement depuis `src/app/api/webhooks/*`.
