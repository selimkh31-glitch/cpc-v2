# CPC V2 — 07 · Checklist des accès et variables

**Règle d'or :** ne colle **aucun secret** dans la conversation. Saisis les valeurs sensibles directement dans Vercel, Supabase ou GitHub Secrets. J'ai seulement besoin des **identifiants non sensibles** et d'un **accès via les connecteurs**.

---

## 1. À créer par toi (Phase 0)

### GitHub
- [ ] Nouveau repo **privé** (ex. `cpc-v2`), vide, sur le compte `selimkh31-glitch` ou une org dédiée.
- [ ] M'en donner l'accès en écriture uniquement au moment du GO (je l'ajouterai alors à la session). **Aucun accès écriture à `CPC`, `CPCP`, `Cpclanding`, `clubpro-match`.**
- [ ] Protection de `main` : PR obligatoire et CI verte.

### Supabase (projet staging)
- [ ] Nouveau projet dans une **organisation distincte de V1** (recommandé), région **eu-west-3 (Paris)**, plan Free pour démarrer.
- [ ] Mot de passe DB fort, conservé dans ton gestionnaire de mots de passe.
- [ ] Me communiquer : **project ref**, **URL du projet**, **clé publishable** (`sb_publishable_…`, non secrète).
- [ ] Connecter le connecteur Supabase de Claude au compte qui possède ce projet. Je vérifierai que la ref ≠ `cfgvtyxiggewauevvigm` et ≠ les projets livraison avant toute opération.
- [ ] Réglages (je peux te guider, ou les faire au GO via le connecteur) :
  - Auth → Site URL + Redirect URLs : `http://localhost:3000/**`, URL Preview Vercel, domaine prod (D-18)
  - Auth → confirmation d'email activée ; SMTP custom (D-17)
  - API → schémas exposés : `public`, `api` (pas `private`)
  - Database → extension `pg_cron` activée
  - Realtime → accès public désactivé (canaux privés uniquement)

### Vercel
- [ ] Nouveau projet lié au nouveau repo (pas `cpc`, `cpc-v1kt`, `cpclanding` ni `cpcp-ed8e`).
- [ ] Protection des Previews par mot de passe ou Vercel Authentication.
- [ ] Plan Hobby acceptable en dev ; **Pro obligatoire avant la production commerciale** (CGU Hobby).

### Email (D-17)
- [ ] Compte Resend (ou autre), domaine expéditeur vérifié (DNS SPF/DKIM), clé API saisie **dans Supabase Auth → SMTP**, pas dans l'app.

### Google OAuth (si D-05 = b)
- [ ] Projet Google Cloud, écran de consentement, client OAuth « Web ».
- [ ] Redirect URI autorisée : `https://<project-ref>.supabase.co/auth/v1/callback`.
- [ ] Client ID et secret saisis **dans Supabase → Auth → Providers → Google**.

### Domaine (D-18)
- [ ] Domaine acheté, accès DNS (pour Vercel et Resend).

### Plus tard
- [ ] **Sentry** (optionnel, non requis pour le GO ; requis avant la prod) : projet Next.js, DSN, token d'upload des source maps.
- [ ] **Apple Sign In** (si réactivé) : Apple Developer, Services ID, clé `.p8`, Team ID, Key ID.
- [ ] **Stripe / MoR** (Phase 6) : compte au nom de l'entité éditrice (D-19), clés en mode test, secret de webhook.
- [ ] **Supabase prod** (Phase 7) : second projet en plan Pro, sauvegardes activées.

---

## 2. Variables d'environnement

### Application Next.js (Vercel + `.env.local`)
| Variable | Exposée navigateur | Sensible | Phase | Où la saisir |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | oui | non | 1 | Vercel (Preview / Prod), `.env.local` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | oui | non | 1 | idem |
| `NEXT_PUBLIC_SITE_URL` | oui | non | 1 | une valeur par environnement |
| `SUPABASE_SECRET_KEY` | **non** | **oui** | 6 (webhooks) | Vercel seulement ; absente tant qu'elle n'est pas nécessaire |
| `MEDIA_SIGNED_URL_TTL` | non | non | 1 | défaut 600 s, plafond 900 s (ADR-0015) |
| `SENTRY_ENABLED` | non | non | optionnel | `false` par défaut ; `true` en Preview/Prod si un DSN est fourni |
| `NEXT_PUBLIC_SENTRY_DSN` | oui | non | optionnel | Vercel |
| `SENTRY_ENVIRONMENT` / `SENTRY_TRACES_SAMPLE_RATE` | non | non | optionnel | Vercel |
| `SENTRY_AUTH_TOKEN` | non | oui | optionnel | Vercel (build) ; son absence ne fait jamais échouer le build |
| `STRIPE_SECRET_KEY` | non | oui | 6 | Vercel |
| `STRIPE_WEBHOOK_SECRET` | non | oui | 6 | Vercel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | oui | non | 6 | Vercel |

### CI GitHub Actions (Secrets du repo)
| Secret | Usage | Phase |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | CLI : `link`, `db push` vers staging (déploiement des migrations après merge) | 1 |
| `SUPABASE_PROJECT_REF_STAGING` | cible des migrations | 1 |
| `SUPABASE_DB_PASSWORD_STAGING` | `supabase db push` | 1 |
| *(les tests pgTAP tournent sur un Supabase local dans la CI : aucun secret requis)* | | |

### Configurées dans les dashboards, jamais dans l'app
Clé API SMTP (Supabase) · Client ID et secret Google (Supabase) · clé Apple (Supabase) · Redirect URLs (Supabase) · DNS (registrar).

---

## 3. Contrôles d'isolation V1 (à exécuter en S-0.4, avant toute écriture)

- [ ] Project ref V2 ≠ `cfgvtyxiggewauevvigm`, et URL V2 ≠ URL V1.
- [ ] Projet Vercel V2 ≠ `cpc`, `cpc-v1kt`, `cpclanding`, `cpcp-ed8e`.
- [ ] Repo V2 ≠ `CPC`, `CPCP`, `Cpclanding`, `clubpro-match` ; aucun historique Git importé.
- [ ] Aucune variable V1 copiée dans Vercel V2.
- [ ] `scripts/check-no-v1.sh` actif en CI.
- [ ] Seed 100 % synthétique (préfixe `qa_`, emails `@example.test`).
