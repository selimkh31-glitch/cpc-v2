# CPC V2 — 10 · Rapport d'isolation des connexions MCP + verdict G1

**Date :** 25/10/2026, ~22:20 (Paris) · **Mode :** inspection en lecture seule. **Aucune configuration modifiée**, aucune écriture SQL ou Git, aucun secret lu ni affiché.

---

## 1. Inventaire de la configuration MCP de cette session

| Scope | Emplacement inspecté | Constat |
|---|---|---|
| **Managed** (entreprise) | `/etc/claude-code/managed-mcp.json`, `managed-settings.json` | absents |
| **User** (global Claude Code) | `~/.claude.json` → `mcpServers` | **vide** (`[]`) |
| **Local** (par répertoire) | `~/.claude.json` → `projects.*.mcpServers` | **aucun** serveur |
| **Project** | `.mcp.json` dans le répertoire de travail | absent (et le repo `cpc-v2` est vide) |
| **Settings** | `~/.claude/settings.json` | vide (`{}`) |
| **Connecteurs claude.ai** (niveau compte, injectés dans la session) | outils `mcp__Supabase__*`, `mcp__Vercel__*`, `mcp__Shopify__*`, `mcp__Higgsfield_AI__*`, `mcp__bolto__*`, `mcp__Claude_Docs__*`, `mcp__memory__*`… | **seule source** des accès Supabase et Vercel |
| Réseau du workspace | `curl https://mcp.supabase.com/mcp`, `https://api.supabase.com/v1/projects` | **bloqués** (`CONNECT 403`, code 000) |

**Conclusion :** la connexion Supabase actuelle est le **connecteur claude.ai « Supabase »**, autorisé par OAuth sur l'organisation **« COMMAND DIREct »** (`<org-hors-CPC>`). Il n'existe aucune configuration MCP Claude Code (locale, projet ou utilisateur) à modifier ici.

## 2. Connexion COMMAND DIRECT : identifiée, non modifiée

| Test | Appel | Résultat | Verdict |
|---|---|---|---|
| Org visible | `list_organizations` | « COMMAND DIREct » uniquement | ✅ intacte |
| Projets visibles | `list_projects` (rejoué à 22:20) | `<projet-hors-CPC-1>`, `<projet-hors-CPC-2>`, inchangés | ✅ intacte |
| Accès CPC V1 | `get_project(cfgvtyxiggewauevvigm)` | permission refusée | ✅ V1 hors périmètre |
| Accès CPC V2 | `get_project(cglbsllwdmluvbisozyx)` | permission refusée | ❌ attendu, à résoudre |

## 3. Pourquoi une config locale au répertoire CPC V2 n'est pas réalisable ici

| Obstacle | Preuve | Conséquence |
|---|---|---|
| Le workspace cloud ne joint pas Supabase | `mcp.supabase.com` et `api.supabase.com` → CONNECT 403 | un serveur MCP lancé dans ce container ne peut pas fonctionner |
| Le container est **éphémère** | environnement de session réclamé après inactivité | une config `--scope local` serait perdue : **contraire à ton objectif de permanence** |
| Scope `project` = fichier `.mcp.json` versionné | — | nécessiterait un commit dans `cpc-v2` : **écriture Git interdite** |
| OAuth 2.1 interactif | doc Supabase MCP : connexion avec choix de l'organisation | impossible sans navigateur dans le container ; l'alternative par token personnel imposerait de me transmettre un secret : **interdit** |

Je n'ai donc **rien configuré**. Faire semblant aurait produit une connexion non fonctionnelle et non permanente.

## 4. Solution recommandée : un second connecteur claude.ai, limité au projet V2

Le serveur MCP officiel de Supabase accepte des paramètres d'URL qui **restreignent la connexion côté serveur**. `project_ref` fixe le projet et retire les outils de niveau compte (lister les projets, les organisations, en créer…). `read_only=true` retire les outils qui modifient des données. À l'autorisation OAuth, Supabase demande **l'organisation** à laquelle donner accès.

Deux connecteurs coexistent alors de façon **permanente**, au niveau de ton compte :
| Connecteur | URL | Org autorisée | Portée effective |
|---|---|---|---|
| **Supabase** (existant, inchangé) | `https://mcp.supabase.com/mcp` | COMMAND DIREct | projets COMMAND DIRECT |
| **supabase-cpc-v2** (nouveau) | `https://mcp.supabase.com/mcp?project_ref=cglbsllwdmluvbisozyx&read_only=true` | org de CPC V2 | **le seul projet `cglbsllwdmluvbisozyx`, lecture seule** |

### Action exacte à effectuer (par toi, dans claude.ai, ~2 min)
1. Ouvre **Paramètres → Connecteurs** dans claude.ai, puis **Ajouter un connecteur personnalisé** (« Add custom connector »).
2. **Nom :** `supabase-cpc-v2`
3. **URL :** `https://mcp.supabase.com/mcp?project_ref=cglbsllwdmluvbisozyx&read_only=true`
4. Laisse les champs OAuth avancés vides et valide.
5. Clique **Connecter**. La fenêtre Supabase s'ouvre : connecte-toi avec le **compte propriétaire du projet CPC V2**, puis, à l'écran de choix, sélectionne **l'organisation qui contient `cglbsllwdmluvbisozyx`** (surtout pas « COMMAND DIREct », ni l'org de V1).
6. **Ne touche pas** au connecteur « Supabase » existant.
7. Reviens dans cette conversation, vérifie que `supabase-cpc-v2` est activé pour elle (menu des connecteurs de la conversation), puis écris-moi **« connecteur prêt »**. Je recharge les outils sans redémarrer la session.

Si l'option « connecteur personnalisé » n'apparaît pas, c'est que ton offre ou ton organisation claude.ai ne l'autorise pas : dis-le-moi et on passe à l'option B.

### Option B : config vraiment locale, sur ton PC (Claude Code CLI ou desktop)
Dans le dossier local de `cpc-v2`, uniquement :
```
claude mcp add --scope local --transport http supabase-cpc-v2 "https://mcp.supabase.com/mcp?project_ref=cglbsllwdmluvbisozyx&read_only=true"
```
Puis `/mcp` dans Claude Code → `supabase-cpc-v2` → **Authenticate** (même choix d'organisation qu'au point 5). Le scope `local` est stocké dans ta config utilisateur, rattaché à ce dossier, jamais commité. Cette connexion n'existe **que** dans les sessions Claude Code ouvertes dans ce dossier ; elle n'est pas visible depuis les conversations cloud comme celle-ci.

### Limite à connaître
Un connecteur claude.ai est disponible pour **toutes** tes conversations : il ne peut pas être rattaché à un dossier. L'isolation est assurée **par le serveur** (projet unique, lecture seule), pas par le répertoire. Tu peux en plus désactiver `supabase-cpc-v2` dans les conversations COMMAND DIRECT, et l'ancien connecteur dans les conversations CPC.

**Pour la Phase 1 (écritures, après GO) :** il faudra un connecteur sans `read_only`, toujours limité par `project_ref`. Ce sera une étape distincte, soumise à ton GO.

## 5. Accès hérités présents dans cette session (point 6)

| Connecteur | Accès réel constaté | Risque pour CPC V2 | Recommandation |
|---|---|---|---|
| Supabase (COMMAND DIRECT) | org COMMAND DIREct, outils en écriture | ne voit ni V1 ni V2 ; risque de confusion de projet | désactiver dans les conversations CPC V2 une fois `supabase-cpc-v2` en place |
| **Vercel** | équipe complète, **outils en écriture**, dont les 7 projets V1 (`cpc`, `cpc-v1kt`, `cpclanding`, `cpcp-ed8e`, `cpc-admin`, `cpc-admin-mmjb`, `cpc-web-beta`) | ⚠️ **seul accès hérité capable de toucher V1** | garder (nécessaire plus tard pour V2) ; liste d'exclusion ADR-0016 + contrôle d'ID avant chaque appel ; envisager une équipe Vercel dédiée à V2 |
| GitHub (proxy de session) | `cpc-v2` uniquement ; V1 `CPC` → 403 | aucun | ✅ |
| Shopify, Higgsfield, bolto (Blotato) | boutique, médias, réseaux sociaux | hors sujet CPC, aucun lien avec V1 ou V2 | désactiver dans les conversations CPC V2 (moins de surface) |
| memory, Claude_Docs, widgets | personnels ou documentaires | aucun | — |

## 6. Tests du point 8

| Test | Résultat | Verdict |
|---|---|---|
| COMMAND DIRECT inchangé | org et projets identiques avant et après inspection | ✅ |
| CPC V1 exclu du périmètre Supabase | permission refusée | ✅ |
| CPC V1 exclu du périmètre GitHub | 403 | ✅ |
| CPC V1 exclu du périmètre Vercel | **non** : le connecteur Vercel voit et peut modifier les projets V1 | ⚠️ maîtrisé par la procédure (ADR-0016), pas par le droit technique |
| CPC V2 accessible en Supabase | pas de connecteur `supabase-cpc-v2` à ce jour | ⬜ NON VÉRIFIÉ |

## 7. Verdict G1

# ⏸ G1 PARTIEL — HOLD maintenu

- GitHub : ✅ · Supabase V2 : ⬜ (en attente du connecteur `supabase-cpc-v2`) · Vercel : ✅ aucun projet V2 lié, ⚠️ accès V1 hérité documenté.
- **Dès que tu écris « connecteur prêt »**, je recharge les outils et rejoue en lecture seule : identité du projet (ref, org, région, statut), tables de tous les schémas, migrations, extensions, Edge Functions, branches, advisors sécurité ; je vérifie que les outils de niveau compte (lister ou créer des projets) **sont absents**, ce qui prouve le scoping ; puis je mets à jour le rapport G1.
- Restent ouverts : la nature des 3 projets Vercel V1 recensés, et la région du projet (D-34).

Source : [supabase/mcp (GitHub)](https://github.com/supabase/mcp)
