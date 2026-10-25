# ADR-0016 — Isolation de CPC V1

- **Statut :** ✅ VALIDÉ (V-02, V-03, V-07, V-08, V-11)
- **Date :** 25/10/2026

## Décision
- Aucune écriture dans `selimkh31-glitch/CPC`, `CPCP`, `Cpclanding`, `clubpro-match`, le Supabase `cfgvtyxiggewauevvigm`, ni les projets Vercel `cpc`, `cpc-v1kt`, `cpclanding`, `cpcp-ed8e`, `cpc-admin`, `cpc-admin-mmjb`, `cpc-web-beta` (les 3 derniers, liés au repo V1 `CPC`, sont exclus de tout accès en écriture CPC V2 : décision Selim du 25/10, 22:25).
- Le connecteur claude.ai `Supabase` (organisation COMMAND DIRECT) n'est jamais appelé dans les conversations CPC V2. Écritures Supabase V2 uniquement via `supabase-cpc-v2-write`.
- Lecture seule de V1 tolérée pour retrouver des règles ou des cas limites ; aucun copier-coller automatique, aucun secret, aucune donnée.
- Nouveau repo sans historique V1 ; aucune variable V1 dans Vercel V2.
- Garde-fou CI `scripts/check-no-v1.sh` : échec si une ref ou URL V1 apparaît.
- Avant toute opération Supabase ou Vercel, Claude vérifie l'identifiant du projet ciblé.
- Aucune écriture tant que le repo et le Supabase V2 ne sont pas fournis et qu'un GO explicite n'est pas donné.
