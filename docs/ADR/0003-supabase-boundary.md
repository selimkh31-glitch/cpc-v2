# ADR-0003 — Frontière Supabase et gestion du schéma

- **Statut :** ✅ VALIDÉ (V-02, V-04, V-05 ; organisation des schémas approuvée 25/10 21:55)
- **Date :** 25/10/2026

## Décision
- ✅ Nouveau projet Supabase isolé ; aucun lien avec V1.
- ✅ Schéma en migrations SQL versionnées via Supabase CLI ; **aucun ORM, pas de Prisma**.
- ✅ Types TypeScript générés (`supabase gen types`), jamais édités à la main.
- ✅ Trois schémas : `public` (tables lisibles sous RLS), `api` (RPC exposées), `private` (helpers, audit, staff, idempotence, billing, jobs ; non exposé).
- ✅ `REVOKE ALL` par défaut sur `anon` et `authenticated`, puis `GRANT` explicites table par table et colonne par colonne.
- ✅ Clé secrète Supabase réservée aux webhooks et au code `server-only` ; absente tant qu'elle n'est pas nécessaire.

## Conséquences
Les policies, contraintes et fonctions vivent dans le même outil que les tables ; la RLS n'est jamais contournée par une connexion directe d'ORM.
