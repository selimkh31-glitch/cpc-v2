# ADR-0015 — Stockage des médias

- **Statut :** 🟡 VALIDÉ SOUS RÉSERVE. Revue v3 favorable (Selim, 25/10 22:02). **Réserve maintenue** : levée après exécution des tests Storage ci-dessous (policies, expiration des URL, blocages), avec preuves.
- **Date :** 25/10/2026 · **Révision :** v3

## Décision
1. **Buckets privés** `avatars` et `crests` : aucune lecture publique, aucun listing.
2. **Lecture via URL signées de courte durée** : **TTL de 10 minutes** (`MEDIA_SIGNED_URL_TTL`, plafonné à 15 min).
   - Générées **côté serveur**, par lot (`createSignedUrls`), avec le client portant le JWT de l'utilisateur. Le droit de signer découle donc des policies Storage, sans clé secrète.
   - Délivrées seulement à un utilisateur authentifié autorisé à voir le profil ou le club (non bloqué, profil non supprimé, club actif).
3. **Policies `storage.objects`**
   | Opération | Règle |
   |---|---|
   | SELECT `avatars` | authentifié ; propriétaire du dossier `{uid}`, ou profil cible visible et non bloqué (helpers `private.*`) |
   | SELECT `crests` | authentifié ; club actif visible |
   | INSERT / UPDATE / DELETE `avatars` | propriétaire uniquement, chemin `avatars/{uid}/{uuid}.{ext}` |
   | INSERT / UPDATE / DELETE `crests` | OWNER ou manager actif du club, chemin `crests/{clubId}/{uuid}.{ext}` |
   | anon | aucun accès |
4. **Contraintes de fichier** : ≤ 2 Mo ; MIME en liste blanche `image/png`, `image/jpeg`, `image/webp` (**SVG interdit**, vecteur XSS) ; nom de fichier UUID généré serveur ; remplacement = nouvel objet + suppression de l'ancien.
5. **Côté client** : le composant d'avatar gère l'expiration (re-demande d'URL en cas d'erreur 400/403) ; aucune URL signée persistée en base ni en cache longue durée ; `next/image` configuré pour le domaine Storage du projet V2 uniquement.
6. **Cycle de vie** : à la suppression d'un compte ou à la dissolution d'un club, purge des objets (D-06).

## Limite connue : une URL signée n'est pas révocable instantanément
Une URL signée reste valide **jusqu'à son expiration** (≤ 10 min, plafond 15 min), même si entre-temps :
- le propriétaire bloque le porteur de l'URL ;
- un profil est suspendu ou un club dissous ;
- les droits de lecture sont révoqués.

Seule la **suppression ou le remplacement de l'objet** rend l'URL inopérante immédiatement.
**Acceptation du risque :** fenêtre d'exposition bornée par le TTL, sur un contenu peu sensible (avatar, blason).
**Mitigations :** TTL court ; aucune URL persistée en base ni en cache longue durée ; à un blocage, le client purge les URL en mémoire et refetch ; aucune nouvelle signature n'est délivrée dès la confirmation serveur du blocage ; à la suppression d'un compte, les objets sont supprimés (invalidation immédiate). Cette limite est mentionnée dans la politique de confidentialité si nécessaire (D-19).

## Tests obligatoires (pgTAP + e2e)
| # | Scénario | Attendu |
|---|---|---|
| S1 | Anonyme demande une signature ou un objet | refus |
| S2 | Utilisateur bloqué par le propriétaire demande une **nouvelle** signature | refus |
| S3 | URL signée **avant** blocage, utilisée **après** blocage | reste valide jusqu'au TTL (comportement documenté ci-dessus), puis 4xx |
| S4 | URL utilisée après le TTL | 4xx ; le client re-demande une URL |
| S5 | Écriture par un non-propriétaire dans `avatars/{uid}` | refus |
| S6 | Écriture par le manager d'un autre club dans `crests/{clubId}` | refus |
| S7 | Fichier SVG ou > 2 Mo | refus |
| S8 | Objet supprimé (compte supprimé) avec une URL encore dans son TTL | 4xx immédiat |
| S9 | `MEDIA_SIGNED_URL_TTL` > 900 | plafonné à 900 |

## Conséquences
Conformité stricte à PRO-01. Coût : signature à chaque rendu de liste et cache navigateur limité au TTL, acceptable aux volumes visés. Mesuré en Phase 7 (D-10).
