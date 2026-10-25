# ADR-0001 — Stack applicative

- **Statut :** ✅ VALIDÉ (Selim, 25/10/2026 21:55 — orientation technique Lot 1 approuvée)
- **Date :** 25/10/2026 · **Décideur :** Selim

## Contexte
CPC V2 est une web app mobile-first avec rendu serveur, auth par cookie et mutations serveur (SPEC §1, §6).

## Décision
| Élément | Choix | Statut |
|---|---|---|
| Framework | Next.js App Router, React 19 | ✅ |
| Langage | TypeScript `strict` | ✅ |
| Styles | Tailwind CSS v4 + design tokens en variables CSS | ✅ |
| Validation | Zod aux frontières (formulaires, actions, réponses RPC) | ✅ |
| Runtime / paquets | Node LTS actif, pnpm | ✅ |
| Versions | Dernières stables au jour du scaffold, épinglées dans le lockfile | ✅ |

## Conséquences
SSR et Server Actions natifs ; écosystème Supabase SSR officiel. Les montées de version majeure passent par une PR dédiée.
