# CPC V2 — 08 · Checklist GO Phase 1 (définitive)

**Version :** 1.1 — 25/10/2026 (22:02) · **Statut actuel : ⏸ HOLD. Aucun développement autorisé.**
Le GO n'est valable que lorsque **toutes** les cases bloquantes (🔒) sont cochées **et** que Selim l'énonce explicitement (section F).

---

## A. Décisions (registre 02 v2.1)
- [x] 🔒 V-01 → V-11 validés
- [x] 🔒 D-05 Email + Google · D-14 15 postes · D-15 PS5/Xbox Series/PC · D-16 FR + i18n · D-17 Resend · D-20 pseudo + gamertag
- [x] 🔒 D-12 couvert par une stratégie temporaire étiquetée (`AGE_MIN = 18`, 🟠)
- [ ] D-18 domaine : non bloquant pour le GO (requis pour les tests d'inscription sur staging et pour la prod)
- [ ] D-19 entité éditrice : non bloquant pour le GO (requis avant l'ouverture publique)

## B. ADR (index v3)
- [x] 🔒 Orientation technique Lot 1 approuvée (0001, 0003, 0005–0011, 0016 ✅)
- [x] 🔒 Revue des corrections v3 favorable : ADR-0002, 0012, 0015 (Selim, 22:02) ; réserves maintenues jusqu'aux preuves en Phase 1
- [x] 🔒 Choix techniques jugés acceptables pour démarrer le Lot 1, sous condition des autres cases
- [x] 🔒 ADR-0004 🟡 accepté avec Definition of Done par commande
- [x] 🔒 Tests de permissions (P1–P10) et de concurrence (C1–C11) conservés intégralement

## C. Prérequis fournis par Selim
- [x] 🔒 **Nouveau repo GitHub** `selimkh31-glitch/cpc-v2`, privé, vide (G1 ✅) ; protection de `main` à poser au premier commit —, vide, nom communiqué ; protection de `main` (PR + CI)
- [x] 🔒 **Nouveau projet Supabase** `cglbsllwdmluvbisozyx` déclaré — (org distincte de V1 recommandée, région Paris) : ref + URL + clé publishable communiquées, **aucun secret dans le chat**
- [x] 🔒 Connecteur `supabase-cpc-v2` (limité à `project_ref`, lecture seule) opérationnel — G1 ✅ ; **variante en écriture, toujours limitée à `project_ref`, à activer au GO**
- [ ] 🔒 Accès en écriture de Claude au **seul** nouveau repo (ajouté au moment du GO)
- [ ] Cahier UX `CPC_Cahier_UX_V1_Reference.docx` transmis à Claude. Non bloquant pour le socle (S-1.1 → S-1.6) ; **bloquant avant les écrans** (S-1.7 et suivantes).
- [ ] Projet Vercel V2 : non bloquant pour démarrer ; requis pour la démo de la gate G2
- [ ] Compte Resend : non bloquant en local (emails capturés par Supabase CLI) ; requis sur staging

## D. Contrôles d'isolation G1, exécutés par Claude dès la mise à disposition des environnements
**Séquence imposée (Selim, 22:02) : Claude ne crée aucun environnement. À la mise à disposition, il exécute uniquement les contrôles G1 ci-dessous, en lecture seule, puis remet son rapport. Aucune implémentation avant le GO qui suit ce rapport.**
Méthode : connecteurs GitHub, Supabase et Vercel en lecture (listes, métadonnées, tables, migrations, extensions, variables d'environnement par **nom** uniquement, jamais leurs valeurs). Aucun clone ni appel en écriture.
- [x] 🔒 Ref Supabase V2 ≠ `cfgvtyxiggewauevvigm` et ≠ les projets non-CPC visibles sur le compte (SB-7)
- [x] 🔒 Projet Supabase V2 vide : 0 table, 0 migration, 0 Edge Function, 0 utilisateur, 0 bucket (SB-3 à SB-9) ; ⚠️ `rls_auto_enable()` à durcir en migration n°0
- [x] 🔒 Repo V2 ≠ `CPC`, `CPCP`, `Cpclanding`, `clubpro-match` ; repo vide, sans historique V1 (GH-1 à GH-4)
- [ ] 🔒 Si Vercel est fourni : projet ≠ `cpc`, `cpc-v1kt`, `cpclanding`, `cpcp-ed8e` ; aucune variable V1
- [x] 🔒 Connecteur Supabase : la liste des projets visibles est relevée (SB-1, SB-2) ; aucune opération ne cible un projet autre que la ref V2 fournie
- [x] 🔒 Rapport G1 final remis (`09_RAPPORT_G1_ISOLATION.md` v2) — **G1 ✅ VALIDÉ**
- [ ] 🔒 **D-34 région** tranchée (eu-west-2 gardé, ou recréation en eu-west-3) **avant la première migration** : pour chaque contrôle, la commande ou l'appel exécuté, le résultat brut et un verdict OK/KO. Un contrôle non exécutable est marqué **NON VÉRIFIÉ**, jamais OK.

## E. Périmètre autorisé par le GO Phase 1 (et rien d'autre)
**Autorisé (seulement après le rapport G1 et le GO) :** écritures dans le nouveau repo (branches et PR, commits en français) ; migrations SQL sur le nouveau Supabase **staging** uniquement ; réglages Auth et API listés dans 07 ; stories S-1.1 → S-1.12, dont le spike S-1.4a.
**Interdit :** toute écriture dans V1 ; tout projet Supabase ou Vercel autre que V2 ; création de projets par Claude ; déploiement en production ; données réelles ; tables hors Phase 1 ; paiement ; intégration EA ; fusion d'une commande SQL sans ses preuves R1–R4.

## F. Formule de GO attendue
> « GO Phase 1 — repo `<nom>` — Supabase `<ref>` — ADR 0002/0012/0015 v3 validés. »

## G. Gate de sortie G2 (rappel)
Règle de preuve : chaque test déclaré réussi est accompagné de sa sortie d'exécution (CI ou journal). Un test non exécuté est déclaré **NON EXÉCUTÉ**, jamais PASS.

Login réel avec confirmation d'email · onboarding · shell 3 onglets · états UX · spike A1–A8 **intégralement** exécuté et vert, ADR-0002 → ✅ · tests Storage S1–S9 verts, ADR-0015 → ✅ · dev et build prouvés sans Sentry, ADR-0012 → ✅ · tests P1, P2, P4, P5, P7, P9, P10 et C11 verts sur le périmètre Phase 1 · build et dev sans Sentry · axe-core sans violation critique · démo Preview mobile et desktop · rapport de phase avec sorties CI. **Aucun PASS sans exécution.**
