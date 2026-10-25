# ADR-0013 — Abonnement Pro et paiement

- **Statut :** ⚪ OUVERT (D-07) · principe V-10 ✅
- **Date :** 25/10/2026

## Acquis
- ✅ **Aucun prix inscrit dans le schéma ni dans le code métier.** L'entitlement est binaire (`pro_entitlements.status`, `current_period_end`) ; le prix, l'essai et les remboursements vivent chez l'opérateur.
- Contrôle `has_pro` côté serveur pour COMBLER (LIV-06, T-15).
- Webhooks signés et idempotents, anti-rejeu ; le client ne peut jamais écrire son plan.
- Aucun paiement réel sans accord explicite de Selim.

## À décider (avant la Phase 6)
Opérateur (Stripe ou Merchant of Record), prix, essai, remboursement, comportement en cas de défaillance des webhooks, porteur de l'entitlement (D-32 🔵 : utilisateur), entité marchande (D-19).
