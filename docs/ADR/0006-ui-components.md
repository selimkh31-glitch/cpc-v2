# ADR-0006 — Composants UI

- **Statut :** ✅ VALIDÉ (Selim, 25/10/2026 21:55 — orientation technique Lot 1 approuvée)
- **Date :** 25/10/2026

## Décision
shadcn/ui (primitives Radix copiées dans `src/components/ui`), tokens de design en variables CSS, cible WCAG 2.1 AA, cibles tactiles ≥ 44 px, respect de `prefers-reduced-motion` (UX-03/04). Le design visuel s'aligne sur le cahier UX (V-09).

## Conséquences
Composants maîtrisés et accessibles, sans dépendance à une librairie lourde. À revalider après lecture du cahier UX.
