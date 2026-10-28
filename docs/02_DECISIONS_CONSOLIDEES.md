# CPC V2 — 02 · Registre consolidé des décisions

**Version :** 2.1 — 25/10/2026, après la revue des ADR Lot 1 (21:55). Ce registre **remplace** `02_OPEN_DECISIONS.md` v1.
**Règle :** seul Selim fait passer une ligne en ✅. Une recommandation de Claude reste 🔵 tant qu'elle n'est pas validée, et n'est jamais appliquée comme décision tacite.

| Statut | Signification |
|---|---|
| ✅ **VALIDÉ** | Décidé par Selim, applicable |
| 🟡 **VALIDÉ SOUS RÉSERVE** | Décidé, mais conditionné à des preuves listées |
| 🟠 **ORIENTÉ** | Direction donnée par Selim, validation formelle en attente ; implémentable seulement comme stratégie temporaire étiquetée |
| 🔵 **PROPOSÉ** | Recommandation de Claude, non validée ; à trancher avant la phase indiquée |
| ⚪ **OUVERT** | Aucune direction retenue |
| ⏸ **DIFFÉRÉ** | Écarté du périmètre actuel, à rouvrir plus tard |

---

## 1. Orientations structurantes

| ID | Décision | Statut | Source |
|---|---|---|---|
| V-01 | Next.js App Router + TypeScript | ✅ | Selim 25/10 |
| V-02 | Nouveau projet Supabase isolé (aucun lien avec `cfgvtyxiggewauevvigm`) | ✅ | SPEC §0 + Selim 25/10 |
| V-03 | Hébergement Vercel, nouveau projet | ✅ | SPEC §0 + Selim 25/10 |
| V-04 | Schéma en SQL versionné (Supabase CLI), **sans Prisma** | ✅ | Selim 25/10 |
| V-05 | RLS sur toutes les tables exposées + mutations sensibles par commandes transactionnelles | ✅ | Selim 25/10 |
| V-06 | Realtime en Broadcast privé, non autoritaire, suivi d'un refetch canonique | ✅ | Selim 25/10 |
| V-07 | Aucun accès en écriture à CPC V1 (repo, Supabase, Vercel) ; lecture seule tolérée | ✅ | SPEC §0 + Selim 25/10 |
| V-08 | Aucune migration de données ni de schéma V1 ; données QA 100 % synthétiques | ✅ | SPEC §7 + Selim 25/10 |
| V-09 | `CPC_Cahier_UX_V1_Reference.docx` (25/10/2026) = référence UX, à joindre dans `docs/reference/` du nouveau repo | ✅ | Selim 25/10 |
| V-10 | Aucun prix Pro inscrit dans le modèle de données ni dans le code métier. L'entitlement est binaire (actif/inactif) ; le prix vit uniquement chez l'opérateur de paiement | ✅ | Selim 25/10 |
| V-11 | Aucune écriture (Git, SQL, configuration, déploiement) avant fourniture du repo et du projet Supabase V2 **et** GO explicite | ✅ | Selim 25/10 |

---

## 2. Lot 1 — Fondations

| ID | Sujet | Valeur retenue | Statut | Bloque |
|---|---|---|---|---|
| D-05 | Fournisseurs d'auth | **Email + mot de passe + Google**. Apple ⏸ différé. Aucun bouton affiché pour un fournisseur non configuré. | ✅ | — |
| D-12 | Âge minimum | **18 ans ou plus, par déclaration**, sans date de naissance stockée. Implémenté comme **seuil configurable étiqueté TEMPORAIRE** (`AGE_MIN = 18`) tant que la validation juridique n'est pas faite. | 🟠 | Ouverture publique |
| D-14 | Référentiel de postes | **15 codes** : GK (1) · DEF : RB, LB, CB, RWB, LWB (5) · MID : CDM, CM, CAM, RM, LM (5) · ATT : RW, LW, CF, ST (4). Soit 1 + 5 + 5 + 4 = 15. 1 poste principal + ≤ 3 secondaires, distincts du principal. | ✅ | — |
| D-15 | Plateformes | PS5 / Xbox Series / PC | ✅ | — |
| D-16 | Langue | Français, avec infrastructure i18n dès le scaffold. Bibliothèque : voir ADR-0010 (🔵). | ✅ | — |
| D-17 | SMTP | **Resend** | ✅ | — |
| D-18 | Domaine de production | À venir. Non bloquant en local, où les emails d'auth sont capturés par le serveur mail local de Supabase CLI. **Requis** pour : expéditeur Resend vérifié (envoi à des adresses tierces sur staging), redirections OAuth de prod. | ⚪ | Tests d'inscription multi-comptes sur staging ; prod |
| D-19 | Entité éditrice | À définir | ⚪ | **Ouverture publique** (CGU, confidentialité, compte marchand) |
| D-20 | Identité joueur | Pseudo CPC unique + gamertag EA distinct, déclaratif, jamais présenté comme vérifié | ✅ | — |

**Bilan Lot 1 :** toutes les décisions impactant le Lot 1 ont une valeur confirmée, ou une stratégie temporaire étiquetée (D-12). Le critère SPEC §11 est rempli **côté décisions**.

---

## 2 bis. Phase 2 produit — design (à trancher avant P2-A, `docs/22`, `docs/23`)

| ID | Sujet | Recommandation | Statut |
|---|---|---|---|
| D-41 | Direction visuelle | « Stade de nuit », palette **noir, vert, blanc, gris** (Selim), sombre par défaut + thème clair complet, typographie système iOS, néon réservé au LIVE (`docs/23` §2) | ✅ |
| D-42 | Dépendances UI | shadcn/ui (Radix Dialog, Slot) + `lucide-react`, versions épinglées | ✅ |
| D-43 | Blasons de club | Bucket privé `crests`, URL signées (ADR-0015) | 🔵 |

## 3. Phase 2 — Clubs (à trancher avant la Phase 2)

| ID | Sujet | Recommandation | Statut |
|---|---|---|---|
| D-21 | Création de club | Tout joueur onboardé avec un slot libre ; PRIMARY si libre, sinon SECONDARY ; refus avec 2 affiliations ; créateur = OWNER ; 1 création / 24 h | ✅ (Selim, 28/10/2026) |
| D-13 | Remplacement du SECONDARY si OWNER ou manager | OWNER avec d'autres membres : refus `OWNER_MUST_TRANSFER`. Manager : autorisé, avec perte du rôle annoncée avant consentement, et audit. | 🔵 |
| D-06a | Dissolution | OWNER seul membre uniquement ; club archivé, historique conservé | 🔵 |
| D-22 | Durées d'expiration | Candidature 14 j · invitation club 7 j · transfert 72 h (paramètres serveur) | 🔵 |
| D-23 | Visibilité des clubs | Utilisateurs authentifiés **autorisés** uniquement (onboardés, sans blocage avec l'OWNER) ; aucune page publique anonyme ; aucun accès `anon` | ✅ (Selim, 28/10/2026) |

## 3 bis. Phase 2 produit — lot P2-B « Explorer Clubs » (`docs/25`)

Tranchées par Selim le 28/10/2026 à 19:43.

| ID | Sujet | Décision | Statut |
|---|---|---|---|
| D-43 | Blasons de club | **Reportés** ; monogramme (initiales) temporaire. Bucket privé `crests` (ADR-0015) dans un lot ultérieur | ✅ report |
| D-45 | Premier lot fonctionnel | Explorer Clubs, lot vertical : socle indispensable (helpers, blocages côté serveur) + création de club, fiche, recrutement + Explorer Jouer / Clubs. Recrutement (candidatures, invitations) au lot suivant. Ordre du master plan `docs/22` mis en cohérence | ✅ |
| D-46 | Candidature sur les fiches club | Aucune mention (ni bouton, ni texte, ni « bientôt ») tant que le parcours n'existe pas | ✅ |
| D-47 | Segment Jouer | Visible, avec un état vide véridique ; aucune donnée ni action fictive | ✅ |
| D-48 | Recherche de clubs | Par nom, insensible à la casse et aux accents ; normalisation par `translate()` sans extension ; pas de `pg_trgm` | ✅ |
| — | Navigation et rôles | Trois onglets Accueil / Explorer / Profil conservés ; le créateur d'un club reste joueur ; droits OWNER et manager contextuels au club, contrôlés côté serveur | ✅ |

---

## 4. Phase 3 — Radar et LIVE

| ID | Sujet | Recommandation | Statut |
|---|---|---|---|
| D-01 | Joueur affilié, LIVE hors session, proposable | Oui, si Radar volontaire et aucune participation active | 🔵 |
| D-01b | Anti-abus Radar | 1 Radar actif ; ≤ 6 activations par heure | 🔵 |
| D-02 | Participations simultanées | Une seule participation LIVE active par joueur | 🔵 |
| D-24 | Sessions par club | Une session active par club | 🔵 |
| D-25 | Modèle de terrain | Formations en liste fermée ; 11 postes ; banc ≤ 11 ; capacité 22 | 🔵 |
| D-26 | Accès au LIVE de son club | Créateur participant d'office ; membres du club en accès direct ; externes par demande ou invitation | 🔵 |
| D-27 | Feuille finalisée | Fermeture manuelle = snapshot finalisé ; une expiration ne finalise pas | 🔵 |
| D-03 | Prolongations | 30/60/120 min, plafond 6 h, contrôle `expected_expires_at` | 🔵 |
| D-11b | Rappels et présence | Rappel T−10 min ; présence technique sans effet automatique | 🔵 |
| D-28 | Invitation LIVE hors Radar | Membres du club : oui. Externes : seulement s'ils sont LIVE hors session. | 🔵 |
| D-29 | Validité demandes et invitations LIVE | 10 min ; invalidées à la fermeture ou à l'expiration | 🔵 |

## 5. Phase 4 — Explorer et EA

| ID | Sujet | Recommandation | Statut |
|---|---|---|---|
| D-04 | Source EA, liaison, champs, cadence | Aucune intégration avant une source autorisée validée par écrit. Provider `Unavailable` par défaut. | ⚪ (stratégie par défaut 🔵 ADR-0014) |
| D-11 | « Manager autorisé » (Explorer Joueurs) | OWNER ou manager actif d'au moins un club, sans sanction active | 🔵 |

## 6. Phase 5 — Social et Safety

| ID | Sujet | Recommandation | Statut |
|---|---|---|---|
| D-30 | Conversations | 1:1 avec contexte optionnel ; groupes ⏸ | 🔵 |
| D-31 | Avis | Joueur → joueur, co-présents sur une feuille finalisée, ≤ 7 j, 3 critères de 1 à 5, agrégats si ≥ 3 avis, commentaires réservés à la modération | 🔵 |
| D-09 | Modération et sanctions | Revue humaine ; avertissement → mute → suspension → bannissement ; appel sous 14 j | 🔵 (textes ⚪, dépendent de D-19) |
| D-06b | Suppression de compte et rétention | Anonymisation du profil, purge des données privées, messages anonymisés, délai de grâce à fixer | 🔵 |
| D-08 | PWA / Web Push | PWA installable sans cache de données privées ; notifications in-app ; Web Push ⏸ | 🔵 |

## 7. Phase 6 — Pro

| ID | Sujet | Recommandation | Statut |
|---|---|---|---|
| D-07 | Opérateur de paiement, **prix**, essai, remboursement | Opérateur : Stripe ou Merchant of Record (à comparer). **Prix : non fixé** (voir V-10). | ⚪ |
| D-32 | Porteur de l'entitlement | Par utilisateur (le manager qui lance COMBLER) | 🔵 |

## 7 bis. Sécurité de session (ouverte par le spike S-1.4a)

| ID | Sujet | Options | Statut |
|---|---|---|---|
| D-40 | Révocation d'une session déconnectée ailleurs | **Validé sous conditions (Selim, 25/10/2026 23:58)** : (1) étudier et tester en staging une durée de vie du JWT de **10 à 15 min** ; (2) prévoir une **vérification serveur de session toujours active** pour les actions sensibles ; (3) ne jamais prétendre qu'un JWT valide est révoqué immédiatement par une déconnexion globale ; (4) documenter les garanties et leurs limites (ADR-0002) ; (5) ajouter les tests de révocation immédiate de la solution retenue **avant** sa généralisation (A5b) | 🟡 |

## 8. Release

| ID | Sujet | Recommandation | Statut |
|---|---|---|---|
| D-10 | SLO, budgets de performance, volumétrie | Budgets fixés sur mesures en préproduction ; volumétrie à fournir | ⚪ |
| D-33 | Environnements | Supabase staging maintenant + prod séparé en plan Pro avant les données réelles ; Vercel Pro avant la prod commerciale | 🔵 |

---

## 9. Journal

| Date | Changement |
|---|---|
| 27/10/2026 (Selim) | Tests iPhone M1–M10 restants **reportés** à une campagne QA ultérieure ; **M2 et M10 obligatoires avant toute publication publique**, non bloquants pour préparer les développements ; **Google OAuth reporté** jusqu'à décision distincte ; Phase 1 / G2 **restent HOLD**. Master plan Phase 2 produit proposé (`docs/22`), D-41 à D-43 🔵 |
| 27/10/2026 19:27 (Selim) | **GO P2-A** ; D-41 ✅ avec palette noir, vert, blanc, gris ; D-42 ✅ |
| 25/10/2026 | v1 : 33 décisions ouvertes issues de l'audit Phase 2 |
| 25/10/2026 | v2 : V-01→V-11 validés ; D-05, D-14, D-15, D-16, D-17, D-20 ✅ ; D-12 🟠 (18+, à valider) ; D-18 et D-19 ⚪ avec impact précisé ; référence au prix Pro retirée (V-10) ; ADR-0004 🟡 |
| 25/10/2026 | v2.1 : D-14 décompte explicité (15 codes, répartition par groupe) ; orientation technique Lot 1 approuvée ; ADR-0002, 0012 et 0015 corrigés (🟡, relecture) ; tests de permissions et de concurrence conservés intégralement (ADR-0011) |
| 26/10/2026 00:00 | Fusions #1 (`363b5f3`), #2 (`4bcaed7`), #3 (`4cf9e74`) autorisées par Selim ; **D-40 🟡 validé sous conditions** |
| 25/10/2026 22:32 (Selim) | **GO Phase 1** ; D-35 ✅ (migrations versionnées, appliquées au seul staging V2 après fusion et vérification) ; D-37 ✅ (Claude : branches, commits, PR ; Selim : validation et fusion) ; D-38 ✅ (durcissement `rls_auto_enable()` + non-régression + rollback préparé) ; D-39 ✅ (un commit documentaire sur `main`, puis PR exclusivement) ; cahier UX reçu → `docs/reference/` |
| 25/10/2026 22:35 | G1 validé ; **D-34 ✅** staging eu-west-2 ; **D-36 ✅** prod future séparée, préférence Paris ; 3 projets Vercel V1 exclus en écriture (ADR-0016 ✅) ; D-38 (`rls_auto_enable` conservée, REVOKE proposé) 🔵 ; D-35, D-37, D-39 (mode opératoire Git/migrations) 🔵 ; connecteur `supabase-cpc-v2-write` vérifié, limité au projet |
| 25/10/2026 22:25 | **G1 ✅** via le connecteur `supabase-cpc-v2` (limité au projet, lecture seule) : projet vide et isolé ; `rls_auto_enable()` d'origine plateforme détectée (REVOKE prévu en migration n°0, après GO) ; D-34 à trancher avant la première migration |
| 25/10/2026 22:15 | G1 partiel : GitHub ✅ ; Supabase V2 non vérifiable (connecteur sans accès) ; 3 projets Vercel liés à V1 ajoutés à ADR-0016 ; nouvelle décision **D-34** ouverte : région du projet V2 (eu-west-2 constatée vs eu-west-3 recommandée) |
| 25/10/2026 22:02 | Revue v3 favorable (0002, 0012, 0015), réserves maintenues ; non-révocation des URL signées documentée (ADR-0015) ; choix techniques acceptables pour le Lot 1 ; création des environnements par Selim, puis contrôles G1 seuls par Claude, puis rapport avant toute implémentation |
| 28/10/2026 19:43 (Selim) | **P2-A** : finitions validées, design system « Stade de nuit » adopté (#33). **P2-B** : D-21, D-23, D-43 (report), D-45, D-46, D-47, D-48 ✅ ; GO limité au sous-lot **B0** (contrats) ; B1–B7 sans GO d'exécution ; aucune migration sans GO spécifique ; G2 HOLD |
