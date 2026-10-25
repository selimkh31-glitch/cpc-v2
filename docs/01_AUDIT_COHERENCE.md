# CPC V2 — 01 · Audit de cohérence

**Documents audités :** `CPC_V2_PRODUCT_SPEC.md` v1.0 (ci-après **SPEC**) et `CPC_V2_ARCHITECTURE_PHASE2.md` v0.1 (ci-après **ARCHI**), 25/10/2026.
**Méthode :** lecture intégrale, croisement exigence par exigence (AUTH, ACC, RAD, EXP, APP, LIV, PRO, CLB, INV, MSG/NOT, SAF, UX), confrontation aux tests T-01→T-18, aux lots et aux gates.
**Périmètre non couvert :** `CPC_Cahier_UX_V1_Reference.docx` et `MASTER PLAN RELEASE CPC` sont cités comme sources n°2 et n°3 mais **n'ont pas été fournis**. CPC V1 n'a pas été consulté (pas nécessaire à ce stade, lecture seule possible plus tard).

---

## 1. Verdict global

Les deux documents sont **globalement alignés** : ARCHI dérive fidèlement de SPEC, respecte la hiérarchie `[V]/[P]/[O]`, les interdits V1 et le principe « Postgres arbitre, Realtime notifie ». Aucune contradiction sur une décision `[V]`.

En revanche, l'audit relève :
- **6 trous fonctionnels** : des règles nécessaires à l'implémentation qui ne figurent dans aucun des deux documents (création de club, modèle de terrain/formation, définition de la « feuille finalisée », rejoindre le LIVE de son propre club, référentiel de postes, langue de l'UI).
- **5 incohérences** entre SPEC et ARCHI, ou internes à l'un d'eux.
- **3 problèmes d'ordonnancement** : des briques prévues tard (blocages, notifications) dont les lots précédents ont besoin.
- **1 manque bloquant de source** : le cahier UX, qui est la source n°2.

---

## 2. Trous fonctionnels (règles absentes des deux documents)

| # | Constat | Exigences impactées | Gravité |
|---|---|---|---|
| G-1 | **Création de club non spécifiée.** Aucune exigence CLB ne dit qui peut créer un club, combien de clubs, si la création consomme une affiliation (PRIMARY ? SECONDARY ?), ni ce qui se passe si le joueur a déjà 2 affiliations. Pourtant OWNER existe partout. | CLB-01/02/07, APP-03 | **Bloquant Lot 2** |
| G-2 | **Modèle du terrain absent.** LIV-03/04 parlent de « terrain par poste » et de « poste libre », ARCHI de « capacité », mais rien sur la formation (fixe ? choisie par le manager ?), le nombre de postes (11 ?), la taille max du banc, ni la capacité de la session. AUTOFILL (LIV-05) est impossible à spécifier sans ça. | LIV-03/04/05, T-05 | **Bloquant Lot 3** |
| G-3 | **« Feuille finalisée » non définie.** PRO-04, T-13 et ARCHI §6.8 conditionnent les avis vérifiés à une feuille finalisée, mais aucune exigence LIV ne crée d'action « finaliser ». La fermeture (LIV-09) vaut-elle finalisation ? Et une session expirée ? | PRO-03/04, LIV-09/10, T-13 | Bloquant Lot 5 (avis), à figer dès le Lot 3 (snapshot) |
| G-4 | **Rejoindre le LIVE de son propre club.** LIV-02 ne couvre que la demande spontanée (validation manager) et l'invitation. Un membre du club doit-il aussi être validé ? Le manager qui lance la session est-il participant d'office ? | LIV-02/03, ACC-01 | **Bloquant Lot 3** |
| G-5 | **Référentiel de postes et de plateformes non défini.** Onboarding (AUTH-03), regroupement de l'effectif (CLB-05), postes recherchés (EXP-04), terrain : il faut une liste fermée de codes. | AUTH-03, CLB-05, EXP-04, LIV-03 | **Bloquant Lot 1** |
| G-6 | **Langue(s) de l'interface non spécifiée.** Les landing pages V1 existent en FR et en EN ; SPEC est muette. Cela conditionne la structure i18n dès le scaffold. | Transverse | Bloquant Lot 1 (structure) |

Autres manques non bloquants immédiatement :
- **Durées d'expiration** des candidatures, invitations club, demandes/invitations LIVE et transferts de propriété : jamais chiffrées.
- **Cible de l'avis** (PRO-03) : joueur → joueur seulement ? joueur → club ? Le joueur évalué voit-il les commentaires ou seulement les agrégats ?
- **Types de conversations** (MSG-01) : 1:1 seulement, ou aussi des fils de groupe (session, club) ? ACC-03 mentionne des « messages » dans la session.
- **Pro par utilisateur ou par club ?** (LIV-06, D-07) : COMBLER est une action de manager pour un club ; on ne sait pas si l'entitlement est porté par le manager ou par le club.
- **Entité éditrice** (mentions légales, CGU, compte marchand) non désignée.

---

## 3. Incohérences SPEC ↔ ARCHI ou internes

| # | Incohérence | Où | Résolution proposée |
|---|---|---|---|
| I-1 | **Lecture du Radar par un joueur simple.** La matrice ARCHI §5 donne au Joueur un droit « S filtrée » sur Radar, alors que SPEC EXP-01/05 réserve Explorer Joueurs aux « managers autorisés ». | ARCHI §5 vs SPEC EXP-05 | Un joueur ne lit que **son propre** Radar. La découverte des joueurs LIVE passe par une RPC réservée aux managers (voir 04_SCHEMA). |
| I-2 | **« Manager autorisé » non défini.** Tout manager de n'importe quel club ? Seulement si son club recrute ? Un manager sanctionné ? | SPEC §3, EXP-05 | Proposition : être OWNER/manager actif d'au moins un club **et** sans sanction active. → registre 02, D-11. |
| I-3 | **Routes divergentes** : `/club/[id]` (SPEC) vs `clubs/[clubId]` (ARCHI) ; `/` ou `/home`. | SPEC §3, ARCHI §3 | Les deux sont `[P]`. Convention figée dans ADR-0005 : pluriel anglais (`/clubs/[clubId]`), `/home` canonique, `/` redirigé. |
| I-4 | **Livrables Phase 2 nommés différemment** : SPEC §12 demande `ARCHITECTURE_PROPOSAL.md`, `ADR_INDEX.md`, `BACKLOG_V2.md`, `OPEN_DECISIONS.md` ; ARCHI §11 demande `docs/ADR/0001-0003`, `SECURITY_MATRIX.md`, `ARCHITECTURE.md`. | SPEC §12, ARCHI §11 | Ce dossier unifie les deux : la numérotation 01→07 correspond à la demande du propriétaire et se range dans `docs/` (voir 05_ARBORESCENCE). |
| I-5 | **SECURITY DEFINER « exceptionnel »** (ARCHI §5) alors qu'ARCHI §6 exige des transitions atomiques qui écrivent des lignes d'autres utilisateurs (accepter une candidature crée l'adhésion d'un tiers ; une invitation LIVE crée un participant). Avec RLS seule, ces écritures demandent des policies d'écriture très larges, ce qui est plus risqué. | ARCHI §5 vs §6 | Assumer un **pattern « command functions »** : fonctions `SECURITY DEFINER` dans un schéma `api` dédié, `search_path` vide, contrôle d'identité et de rôle en tête, `EXECUTE` limité à `authenticated`, test pgTAP par fonction. Aucune écriture directe sur les tables sensibles. → ADR-0004. |
| I-6 | **Lots et gates désalignés** : SPEC prévoit 8 lots (0→7), ARCHI 7 gates (G0→G6). Les Lots 4 (Explorer/EA) et 6 (Pro) n'ont pas de gate. | SPEC §9, ARCHI §10 | Une gate par phase du backlog (06_BACKLOG). |
| I-7 | **Bibliothèques « à ne pas décider prématurément »** (SPEC §6) alors qu'ARCHI propose déjà Radix/shadcn, Zod, Playwright, pgTAP. | SPEC §6 vs ARCHI §1 | Pas de vraie contradiction (ARCHI reste `[P]`), mais chaque choix doit être acté par ADR avant le Lot 1. Recommandations dans 03_ARCHITECTURE. |

### Conflit de règles métier détecté (non couvert)

| # | Conflit | Résolution proposée |
|---|---|---|
| R-1 | **APP-03 / CLB-02 vs CLB-08.** Le remplacement du SECONDARY lors d'une 3ᵉ adhésion fait quitter le club secondaire. Or CLB-08 interdit à un OWNER de quitter un club qui a d'autres membres sans transfert accepté. Si le joueur est OWNER de son club SECONDARY, le remplacement doit être **refusé** (code `OWNER_MUST_TRANSFER`). | Règle explicite à valider (D-13). Pour un manager de son club SECONDARY : remplacement autorisé, le rôle est perdu, l'événement est tracé et le joueur est averti avant de confirmer. |
| R-2 | **SPEC §1 : un OWNER/Manager gère « un ou plusieurs clubs ».** Avec 2 affiliations max et des rôles portés par l'adhésion, un joueur gère **au plus 2 clubs**. | Cohérent si on l'écrit explicitement : le rôle est un attribut de l'adhésion. |
| R-3 | **Club actif (CLB-02, §2)** : « les droits sont réévalués après changement de club actif ». Si l'autorisation dépendait du club actif, un onglet resté ouvert sur l'ancien contexte pourrait agir sur le mauvais club. | Le club actif est une **préférence d'affichage uniquement**. Chaque mutation porte un `club_id` explicite, vérifié côté serveur. |

---

## 4. Problèmes d'ordonnancement des lots

| # | Constat | Correction |
|---|---|---|
| O-1 | Les **blocages** (SAF-01) sont au Lot 5, mais T-11 et EXP-05/INV/LIV exigent que la découverte, les invitations et le LIVE respectent les blocages dès les Lots 2-4. | Table `user_blocks` et helper `is_blocked_between()` dès la Phase 2. L'UI bloquer/débloquer peut attendre la Phase 5, la règle non. |
| O-2 | Les **notifications** (NOT-01) sont au Lot 5, mais les invitations club (Lot 2) et les invitations LIVE urgentes (Lot 3, ACC-01) doivent être signalées. | Table `notifications` alimentée par les commandes dès la Phase 2. Badge et liste minimale tôt, centre complet en Phase 5. |
| O-3 | La **synchronisation EA** au Lot 4 bloque l'Explorer si la source n'est pas tranchée. | Interface `EAProvider` avec une implémentation par défaut `Unavailable`, qui affiche partout « Données indisponibles » (conforme PRO-02/T-12). L'Explorer avance sans attendre la décision EA. |

---

## 5. Points solides à conserver tels quels

- Hiérarchie des sources et étiquettes `[V]/[P]/[O]`.
- Isolation stricte de V1 (repo, Supabase, Vercel, secrets, données) et données QA 100 % synthétiques.
- Heure serveur pour tous les TTL ; les lectures masquent déjà les éléments expirés avant même le passage du job de nettoyage.
- Realtime non autoritaire (signal, puis refetch canonique).
- Codes d'erreur stables, idempotence et protocole de rattrapage réseau.
- Liste des transactions critiques (ARCHI §6) : complète et correcte.
- Jeux de rôles de test (anonyme, A, B, managers, OWNER, admin, bloqué, sanctionné).
- « Pas de PASS sans exécution ».

---

## 6. Risques techniques non mentionnés dans les documents

| Risque | Pourquoi c'est important | Mitigation |
|---|---|---|
| **SMTP Supabase par défaut** | Le SMTP intégré est fortement limité en débit et réservé aux tests ; l'inscription réelle (AUTH-01) ne fonctionnera pas correctement avec des adresses externes. | SMTP personnalisé (ex. Resend) configuré dès le Lot 1 ; domaine expéditeur vérifié. |
| **Plan Vercel Hobby** | Les CGU Hobby interdisent l'usage commercial ; CPC a un abonnement Pro. Le Cron Vercel Hobby est en plus très limité. | Hobby acceptable en dev/preview ; **Vercel Pro avant la production commerciale**. Jobs planifiés via `pg_cron` côté Supabase (indépendant de Vercel). |
| **Plan Supabase Free** | Mise en pause après inactivité, pas de sauvegardes. | Free pour le dev ; projet prod séparé en Pro avant d'accueillir des données réelles (Phase 7). |
| **Source EA non officielle** | Les endpoints communautaires `proclubs.ea.com` sont non documentés, instables et soumis aux conditions d'EA. | Décision D-04 obligatoire avant tout code de synchronisation. Le provider par défaut reste `Unavailable`. |
| **Messagerie et mineurs** | La messagerie entre inconnus avec un public potentiellement mineur crée une exposition juridique (RGPD, âge de consentement numérique en France à 15 ans) et une exposition de sécurité. | Âge minimum décidé avant le Lot 1 (D-12). Pas de date de naissance stockée si une simple déclaration suffit. |
| **Mauvais projet Supabase connecté** | Le compte Supabase actuellement relié à Claude affiche d'autres projets (ex. livraison). Risque d'opérer sur le mauvais projet. | Contrôle d'identité du project ref avant chaque opération, plus un garde-fou en CI qui fait échouer le build si la ref V1 `cfgvtyxiggewauevvigm` apparaît dans le repo. |
