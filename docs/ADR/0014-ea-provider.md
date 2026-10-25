# ADR-0014 — Fournisseur de données EA

- **Statut :** 🔵 PROPOSÉ (stratégie par défaut) · source réelle ⚪ OUVERT (D-04)
- **Date :** 25/10/2026

## Décision
Interface `EAProvider` ; implémentation par défaut `Unavailable` qui renvoie toujours « Données indisponibles » (PRO-02, T-12). Aucun scraping, aucune statistique reconstruite, aucun badge « vérifié » sans preuve. Un provider réel n'est écrit qu'après validation écrite d'une source autorisée (conditions, stabilité, limites, liaison d'identité).

## Conséquences
L'Explorer et les profils avancent sans attendre la décision EA.
