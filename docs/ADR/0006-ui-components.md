# ADR-0006 — Composants UI

- **Statut :** ✅ VALIDÉ (Selim, 25/10/2026 21:55 — orientation technique Lot 1 approuvée). **Mis à jour le 28/10/2026** après P2-A (D-41, D-42), mise à jour soumise à validation.
- **Date :** 25/10/2026 · révision 28/10/2026

## Décision
Composants maison dans `src/components/ui`, construits sur les tokens CSS du design system P2-A (`globals.css`, `@theme inline` de Tailwind v4). Cibles :
- WCAG 2.1 AA ;
- cibles tactiles ≥ 44 px ;
- respect de `prefers-reduced-motion` (UX-03/04) ;
- design visuel aligné sur le cahier UX (V-09).

## Révision P2-A (28/10/2026)

1. **Tokens (D-41).** Palette noir / vert / blanc / gris en deux thèmes, sombre par défaut et clair via `prefers-color-scheme`. Les couleurs sont sémantiques (`canvas`, `surface-1..3`, `ink`, `ink-2`, `ink-3`, `accent`, `on-accent`, `live`, `live-text`, `danger`, `material`) ; aucune couleur codée en dur dans les composants. Les contrastes sont vérifiés par un test unitaire qui lit `globals.css` : texte ≥ 4,5:1, LIVE ≥ 3:1.
2. **Typographie.** Échelle iOS en utilitaires (`text-large-title` … `text-caption`) avec la police système. `tailwind-merge` est étendu pour reconnaître cette échelle.
3. **Radix non retenu pour les dialogues.** `@radix-ui/react-dialog` a été retiré parce que `react-remove-scroll` injecte un `<style>` sans nonce, incompatible avec la CSP stricte d'ADR-0017. Les sheets utilisent le `<dialog>` natif (`showModal()`), qui apporte le focus piégé, Échap et le voile. Seul `@radix-ui/react-slot` est conservé (aucune injection de style). **Règle :** toute nouvelle dépendance UI est refusée si elle injecte du style en ligne sans nonce.
4. **Frontière serveur / client.** Les classes de boutons sont dans `button-styles.ts`, sans `"use client"`, et utilisables par les Server Components. Aucune fonction ne passe en prop d'un Server Component vers un Client Component.
5. **Inventaire.**
   - `ui/` : Button / SubmitButton, `useSubmitLock` (A-3), IconButton (`aria-label` obligatoire), TextField / TextArea, Chip, ChoiceChip, Badge, Avatar, Skeleton, EmptyState, InlineStatus, Sheet, SheetLauncher, ListSection / ListRow, LivePill / LiveHalo.
   - `layout/` : AppHeader, TabBar, ShellTitle.
   - `patterns/` : AuthShell.
   - `states/` : StatePanel, PageSkeleton, OfflineBanner, PendingButton.
6. **Galerie.** `/dev/ui` et `/dev/ui/screens/*` exposent les composants et les écrans réels avec des données fictives. Elles ne sont actives qu'avec `ENABLE_UI_GALLERY=1` et jamais sur Vercel (`notFound()`). La CI y vérifie axe, la CSP, les cibles de 44 px et Reduce Motion, en Chromium et en WebKit.

## Conséquences
- Composants maîtrisés, accessibles et compatibles avec la CSP à nonce, sans librairie lourde.
- Chaque écran Phase 2 se compose avec ces primitives ; un nouveau composant passe par la galerie et ses tests.
- Les tests e2e qui prennent des captures vérifient la CSP **avant** la capture : en WebKit, `page.screenshot()` injecte lui-même un `<style>` (artefact de Playwright).
