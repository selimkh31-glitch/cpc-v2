# CPC V2 — 20 · Lancement de la première Preview privée (iPhone)

**Statut :** prêt à appliquer, **rien n'est créé ni déployé**. Complète `docs/17`, `docs/18` et `docs/19`.
**Cibles exclusives :** dépôt `selimkh31-glitch/cpc-v2`, Supabase staging `cglbsllwdmluvbisozyx`, nouveau projet Vercel `cpc-v2-web`.

## 1. État relevé (26/10/2026, lecture seule)
| Élément | Constat |
|---|---|
| Vercel | Équipe visible par le connecteur : `selimkh31-4924s-projects`. **Aucun projet `cpc-v2-web`**, aucun projet relié au dépôt `cpc-v2`, aucun projet nommé `cpc*`. Seul projet présent : `cd-direct` (sans rapport, ne pas toucher). |
| Branche `preview` | n'existe pas encore (à créer depuis `main` le jour du GO) |
| Réglages GitHub (Actions, environnement `staging-qa`, protection de `main`) | **non lisibles** par l'intégration de Claude : vérification manuelle (§6) |
| Build de production | `pnpm build` OK (Next.js 16.4.3), 15 routes, proxy actif |

## 2. Correctif PWA livré avec ce document
Derrière Vercel Authentication, le navigateur récupère le manifest **sans cookie** si le lien n'a pas `crossorigin="use-credentials"` : réponse 401, manifest ignoré (pas de mode plein écran fiable, icône générique).
- Le manifest est servi par `src/app/manifest.webmanifest/route.ts` (contenu inchangé, `application/manifest+json`).
- `src/app/layout.tsx` émet un **seul** `<link rel="manifest" href="/manifest.webmanifest" crossorigin="use-credentials">`.
- Test `tests/e2e/legal-pwa.spec.ts` complété (un seul lien, attribut `crossorigin`, type MIME).

## 3. Projet Vercel `cpc-v2-web` (création par Selim au GO)
| Réglage | Valeur |
|---|---|
| Équipe | `selimkh31-4924s-projects` (la seule visible ; aucun projet V1 n'y figure) |
| Import Git | `selimkh31-glitch/cpc-v2` — **nouveau projet**, aucune réutilisation |
| Framework / Node | Next.js (détecté) · Node.js **22.x** |
| Install / Build / Output | `pnpm install --frozen-lockfile` · `pnpm build` · défaut |
| Root directory | `/` |
| Région des fonctions | `lhr1` |
| Production Branch | `main`, **aucun domaine** ajouté, aucune promotion. Après import : *Settings → Git → Ignored Build Step* = `if [ "$VERCEL_GIT_COMMIT_REF" = "preview" ]; then exit 1; else exit 0; fi` (seule la branche `preview` construit ; `main` et les autres branches ne sont pas déployées) |
| Deployment Protection | **Vercel Authentication = Standard Protection** (toutes les URL sauf domaine de production, qui n'existe pas) |
| Protection Bypass for Automation | **ne pas générer** pour ce premier GO (aucun test automatisé sur la Preview prévu) ; à créer plus tard pour T-1/C-2 |
| Shareable links / Password protection | désactivés |
| Git Fork Protection | **activée** (défaut ; à vérifier) |
| Vercel Toolbar / Comments | désactivé sur les Previews (sa CSP serait refusée et il n'apporte rien au test) |
| Integrations, Analytics, Speed Insights | aucune |

> Point d'attention au premier import : Vercel lance un déploiement de `main`. Le « Ignored Build Step » n'existe qu'une fois le projet créé : annuler ce premier déploiement s'il démarre, ou l'accepter (il reste protégé par Vercel Authentication, sans domaine de production). Aucune variable n'étant en scope *Production*, il ne pourrait d'ailleurs pas joindre Supabase.

## 4. Variables d'environnement — scope **Preview**, branche **`preview`** uniquement
| Variable | Valeur | Sensibilité |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://cglbsllwdmluvbisozyx.supabase.co` | publique |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé `sb_publishable_…` du staging (Dashboard → Project Settings → API Keys) | publique par nature ; saisie dans Vercel, jamais dans Git |
| `NEXT_PUBLIC_SITE_URL` | `https://cpc-v2-web-git-preview-selimkh31-4924s-projects.vercel.app` — **à confirmer** avec l'alias réellement affiché après le 1ᵉʳ déploiement (Vercel peut tronquer les alias longs) | publique |
| `MEDIA_SIGNED_URL_TTL` | `600` | — |

**Ne pas définir :** aucune variable en *Production* ni *Development* ; aucune clé `service_role`/`sb_secret_…` ; aucune variable Sentry (ADR-0012) ; `ENABLE_AUTH_SPIKE` (uniquement pour C-2, en HOLD).
**Ordre imposé :** les variables `NEXT_PUBLIC_*` sont figées au build : toute modification exige un redéploiement de `preview`.

## 5. P-1 — paramètres exacts (autorisation distincte, `docs/19`)
Supabase staging → Authentication → URL Configuration :
| Réglage | Valeur |
|---|---|
| Site URL | `https://<alias-preview>` (identique à `NEXT_PUBLIC_SITE_URL`, sans `/` final) |
| Redirect URLs | `https://<alias-preview>/auth/callback` **et** `http://localhost:3000/auth/callback` — URL exactes, **aucun joker** |

Avant : relever et capturer les valeurs actuelles (retour arrière). Ne pas toucher à la durée JWT (C-2), à Google (A6) ni à aucun autre réglage Auth.
Sans P-1 : la connexion par mot de passe d'un compte qa pré-créé fonctionne ; les liens d'email (confirmation, réinitialisation) ne fonctionnent pas.

## 6. Vérifications manuelles GitHub (non lisibles par Claude)
- *Settings → Actions → General* : « Fork pull request workflows from outside collaborators » = **Require approval for all outside collaborators** ; « Workflow permissions » = **Read repository contents** ; « Allow GitHub Actions to create and approve pull requests » = décoché.
- *Settings → Environments → `staging-qa`* : Deployment branches = `main` uniquement.
- *Settings → Branches* : `main` protégée (pas de push direct) — recommandé avant d'ouvrir la Preview.
- Aucun workflow `pull_request_target` (vérifié dans le dépôt).

## 7. Comptes de test iPhone
Inscription réelle impossible tant que D-18 (SMTP) n'est pas tranché : 1 compte qa **pré-créé** et confirmé (même procédure que G2 : `qa_*@example.test`, mot de passe aléatoire, marquage `qa_campaign = preview-iphone`), **non onboardé** pour tester M3. Identifiant transmis à Selim hors Git, supprimé en fin de campagne (§9).

## 8. Checklist de lancement (dans l'ordre)
1. [ ] PR de ce document fusionnée, CI `main` verte.
2. [ ] Nettoyage G2 confirmé (0 compte qa sur le staging), secrets `staging-qa` supprimés (§9).
3. [ ] Vérifications GitHub §6.
4. [ ] Branche `preview` créée depuis `main`.
5. [ ] Projet `cpc-v2-web` créé (§3), protection vérifiée **avant** tout ajout de variable.
6. [ ] Variables §4 en scope Preview / branche `preview` ; redéploiement de `preview`.
7. [ ] Alias réel relevé ; `NEXT_PUBLIC_SITE_URL` corrigé si besoin et redéployé.
8. [ ] Contrôle d'accès : l'alias en navigation privée → page de connexion Vercel (jamais l'application).
9. [ ] P-1 appliqué (autorisation distincte) ; valeurs précédentes consignées.
10. [ ] Compte qa iPhone créé (§7).
11. [ ] Campagne M1–M10 (`docs/18` §6.2) : résultats, version iOS, captures.
12. [ ] Fin de campagne : compte qa supprimé ; `ENABLE_AUTH_SPIKE` absent.

## 9. Nettoyage QA — script de référence (SQL Editor du staging)
Supprime uniquement les comptes portant le marquage de la campagne ; annule tout si le nombre attendu n'est pas exact.
```sql
do $qa$
declare campagne text := 'g2-staging-http'; attendu int := 2; ids uuid[]; n int;
begin
  select array_agg(id) into ids from auth.users
   where raw_app_meta_data->>'qa_campaign' = campagne and email like 'qa\_%@example.test';
  if coalesce(cardinality(ids), 0) <> attendu then raise exception 'Garde-fou : % comptes, % attendus', coalesce(cardinality(ids), 0), attendu; end if;
  if exists (select 1 from private.staff_members where profile_id = any(ids) or granted_by = any(ids)) then
    raise exception 'Garde-fou : dépendance staff_members'; end if;
  delete from private.idempotency_keys where profile_id = any(ids);
  delete from private.rate_limits      where profile_id = any(ids);
  delete from public.profile_positions where profile_id = any(ids);
  delete from public.account_settings  where profile_id = any(ids);
  delete from public.profiles          where id = any(ids);           -- FK profiles → auth.users en RESTRICT : avant les utilisateurs
  delete from auth.users               where id = any(ids);           -- identités, sessions, refresh tokens : cascade
  get diagnostics n = row_count;
  if n <> attendu then raise exception 'Garde-fou : % utilisateurs supprimés', n; end if;
end $qa$;
```
Secrets de l'environnement GitHub `staging-qa` à supprimer après confirmation (aucune campagne `staging-http` en cours) : `STAGING_SUPABASE_URL`, `STAGING_PUBLISHABLE_KEY`, `QA_A_EMAIL`, `QA_A_PASSWORD`, `QA_B_EMAIL`, `QA_B_PASSWORD`. Le workflow `staging-http` échoue alors proprement sur son garde-fou « secret vide » ; il sera réalimenté pour une prochaine campagne.

## 10. Risques restants
| Risque | Effet | Parade |
|---|---|---|
| PWA iOS et Vercel Authentication | L'app ajoutée à l'écran d'accueil a son propre stockage : au 1ᵉʳ lancement, iOS peut afficher la connexion Vercel dans la PWA, voire ouvrir Safari pour vercel.com | Tester M7 ; si bloquant, décision séparée (lien partageable temporaire ou bypass par en-tête) |
| Alias Preview différent du nom attendu | Cookies `Secure` et redirections faux | Étape 7 de la checklist |
| Dépôt public | Une PR externe ne doit jamais déployer | Fork Protection + Ignored Build Step limité à `preview` |
| Emails Auth (D-18) | M2 et M10 non exécutables | Compte pré-créé ; M2/M10 « NON EXÉCUTÉ » |
| CSP stricte | Les scripts injectés par Vercel (toolbar) sont bloqués | Toolbar désactivée |
| A6 Google, C-2 | Conditions G2 encore ouvertes | Décisions séparées |
