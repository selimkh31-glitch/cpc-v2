# CPC V2 — 13 · D-40 Sécurité des sessions : implémentation et rapport d'impact

**Date :** 26/10/2026 · **Statut D-40 :** 🟡 validé sous conditions (Selim, 25/10/2026 23:58)
**Règle :** aucune modification de configuration Auth/API Supabase sans ce rapport **et** une autorisation distincte.

## 1. Ce qui est implémenté (PR D-40, sans aucun changement de configuration)
| Élément | Rôle |
|---|---|
| `private.session_is_active(uuid)` | vrai si la session existe encore dans `auth.sessions` et n'a pas dépassé `not_after` ; interne (EXECUTE retiré à tous les rôles clients) |
| `api.assert_session_active()` | lit `session_id` dans le JWT de l'appelant (aucun paramètre : pas d'IDOR) ; `SECURITY DEFINER`, `search_path=''`, EXECUTE pour `authenticated` seulement |
| `sensitiveCheckAction` | `getUser()` **puis** `api.assert_session_active()` ; refus si l'un échoue (échec fermé) |
| Tests | pgTAP `040` (10 tests : R1–R4, session supprimée, `not_after`) ; e2e **A5b réactivé** : refus immédiat alors que le JWT n'a pas expiré, avec garde-fou anti faux succès |

**Garantie obtenue :** une action sensible est refusée **immédiatement** après une déconnexion globale ou la suppression de la session. **Limite maintenue :** les lectures et actions non sensibles restent autorisées jusqu'à l'expiration du JWT (d'où la réduction de durée ci-dessous).

## 2. Changements de configuration nécessaires (NON appliqués — autorisation requise)

### C-1 — Staging : exposer le schéma `api` (Settings → API → Exposed schemas)
- **Pourquoi :** sans exposition, PostgREST ne sert pas `api.assert_session_active()` ; l'action sensible échoue alors **fermée** (`refused`) : sûr, mais bloquant fonctionnellement. Prévu par ADR-0003 pour toutes les commandes futures.
- **Impact :** expose uniquement les fonctions du schéma `api` dont EXECUTE est accordé (aujourd'hui : `assert_session_active` à `authenticated`). Aucun objet de `private`. Invariant pgTAP R2 : aucune fonction `api` exécutable par `anon`.
- **Risque :** faible ; tout futur ajout dans `api` passe par la Definition of Done d'ADR-0004.
- **Vérification après changement :** appel RPC authentifié → `true` ; appel anon → 401/permission refusée ; advisors sécurité.
- **Rollback :** retirer `api` de la liste.

### C-2 — Staging : durée de vie du JWT 10 à 15 min (Settings → Auth → JWT expiry)
- **Valeur actuelle :** non lisible via le connecteur ; défaut Supabase **3600 s** (à confirmer dans le dashboard).
- **Proposition :** **900 s** (15 min) d'abord, puis évaluer 600 s.
- **Impact attendu :**
  - fenêtre maximale d'accès non sensible après déconnexion globale : 60 min → **15 min** ;
  - rafraîchissements plus fréquents : environ 4 par heure et par session active au lieu de 1 (navigateur + proxy) ; la limite de débit Supabase des rafraîchissements est à surveiller (journaux Auth) ;
  - Realtime : ré-authentification du canal à chaque rafraîchissement (couvert par A4) ;
  - onglets en arrière-plan / mobile : rafraîchissement au retour (couvert par A1/A2/A3) ;
  - aucune modification de code requise : la CI tourne déjà avec un JWT de **120 s**, plus strict.
- **Risques :** pic de requêtes `token` sur forte affluence ; déconnexions si l'horloge d'un appareil est très décalée (mitigé par `server_now`, ADR-0009).
- **Plan de test après changement (staging) :** connexion d'un compte qa synthétique ; vérifier `exp − iat = 900` ; navigation après 15 min → rafraîchissement sans déconnexion ; Realtime toujours abonné ; journaux Auth sans erreur de limite. *Ces tests exigent l'application connectée au staging (Vercel Preview, non autorisé à ce stade) ou un script local depuis la CI avec la clé publishable : à arbitrer.*
- **Rollback :** remettre la valeur précédente.

## 3. Décisions demandées
| ID | Demande | Recommandation |
|---|---|---|
| D-40-C1 | Autoriser l'exposition du schéma `api` sur le staging | **Oui**, après fusion de la PR D-40 et application de sa migration |
| D-40-C2 | Autoriser JWT = 900 s sur le staging | **Oui**, puis mesure ; 600 s à réévaluer |
| D-40-T | Moyen de tester le staging de bout en bout (Vercel Preview ou script CI) | Vercel Preview protégé, quand tu autoriseras Vercel |
