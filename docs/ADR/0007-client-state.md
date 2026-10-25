# ADR-0007 — État client

- **Statut :** ✅ VALIDÉ (Selim, 25/10/2026 21:55 — orientation technique Lot 1 approuvée)
- **Date :** 25/10/2026

## Décision
Lectures en Server Components ; état d'écran dans l'URL ; **TanStack Query uniquement** sur les écrans temps réel (LIVE, notifications, messages), invalidés par les événements Broadcast. Aucun state manager global.

## Conséquences
Peu de cache client à synchroniser ; l'état canonique reste celui du serveur (UX-02).
