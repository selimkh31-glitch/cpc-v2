# ADR-0008 — Temps réel

- **Statut :** ✅ VALIDÉ (V-06 ; canaux approuvés 25/10 21:55)
- **Date :** 25/10/2026

## Décision
- ✅ Broadcast sur canaux **privés**, émis par triggers DB après commit ; payload minimal (type, IDs, révision) ; le client **refetch** l'état canonique. Realtime n'est jamais une source de vérité.
- ✅ Canaux : `user:{uid}`, `live:{sessionId}`, `club:{clubId}`, autorisés par policies sur `realtime.messages`. Accès public Realtime désactivé.
- ✅ Refetch à la reconnexion et au retour au premier plan ; désabonnement au logout, au changement de club, au blocage et à la révocation de droits.

## Conséquences
Pas d'« en ligne » inféré du WebSocket. Une perte d'événement est rattrapée par le refetch.
