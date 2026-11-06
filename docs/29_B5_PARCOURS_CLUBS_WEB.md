# CPC V2 — B5 · Parcours Clubs sur le web

**Périmètre :** créer un club, consulter la fiche, consulter l'effectif réel, modifier le recrutement pour OWNER/manager, afficher les affiliations actives dans le Profil.

## Sécurité et contrat
- Pages sous le layout authentifié, garde requireOnboardedUser à chaque page.
- getClubForViewer et getOwnClubs ne lisent que via le JWT utilisateur et les RLS B1/B2, jamais via service_role.
- Les droits de gestion affichés dans l'UI ne sont que des aides ; api.update_club revalide les droits à chaque écriture (anti-IDOR).
- Création via RPC api.create_club, request_id créé à l'affichage et conservé dans le formulaire, double envoi verrouillé, réponse serveur avant navigation de succès.
- Mise à jour via RPC api.update_club et expected_updated_at (verrou optimiste), sans UPDATE direct de tables.
- Niveaux et identifiants déclaratifs ; pas de liaison EA ni activité fictive.
- Aucun CTA Candidater avant le backend Recrutement (D-46).

## Parcours livrés
1. Profil → Mes clubs → Créer un club → wizard 3 étapes → fiche créée.
2. Fiche club : description, plateformes, langues, postes recherchés, effectif groupé GK/DEF/MID/ATT et rôles, avec les profils masqués exclus.
3. OWNER/manager : Gérer le recrutement → réglages et sauvegarde serveur. Les autres utilisateurs ne voient aucun CTA ni la page de gestion (404).
4. Profil : PRIMARY/SECONDARY et rôle pour chaque affiliation active.

## Tests
- CI obligatoire 5/5.
- E2E local avec Supabase : création complète, double clic unique, édition, lecture du club depuis un deuxième compte, page privée anonyme protégée.
- pgTAP RLS et course C7 restent assurés par B2.

## Dépendances et déploiement
B1 et B2 déjà appliqués au staging V2 ; B4 design system fusionné dans main.
Ne synchroniser preview que lorsque les tests B5 et les composants B6 Explorer seront validés ; pas de Production.
Les candidatures/invitations et le LIVE restent hors de ce lot.
