# ADR-0009 — Jobs et échéances

- **Statut :** ✅ VALIDÉ (Selim, 25/10/2026 21:55 — orientation technique Lot 1 approuvée)
- **Date :** 25/10/2026

## Décision
`pg_cron` toutes les minutes appelle `private.job_expire_all()`, idempotent (Radar, LIVE, demandes, invitations, candidatures, transferts, rappel T−10). Toutes les lectures filtrent par `expires_at > now()`, donc un retard du job n'affiche jamais un état expiré. Heure serveur exclusive, et `server_now` renvoyé au client pour le décalage d'horloge.

## Conséquences
Pas de dépendance au Cron Vercel. Granularité d'une minute pour les transitions persistées ; l'affichage reste exact grâce au filtrage.
