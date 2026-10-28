import { notFound } from "next/navigation";
import { Bell, Compass, LogOut, Shield, UserRound } from "lucide-react";
import { AppHeader } from "@/components/layout/app-header";
import { PageTitle, ShellTitleProvider } from "@/components/layout/shell-title";
import { TabBar } from "@/components/layout/tab-bar";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { InlineStatus } from "@/components/ui/inline-status";
import { ListRow, ListSection } from "@/components/ui/list";
import { LiveHalo, LivePill } from "@/components/ui/live";
import { Skeleton } from "@/components/ui/skeleton";
import { TextArea, TextField } from "@/components/ui/text-field";
import { isUiGalleryEnabled } from "@/lib/dev/gallery";
import { GallerySheets } from "./gallery-sheets";

export const metadata = { title: "Galerie UI (développement)", robots: { index: false, follow: false } };

/**
 * Galerie de développement du design system (P2-A, docs/23). Contenus d'exemple, sans donnée réelle,
 * servant aux captures et à la revue. Introuvable hors ENABLE_UI_GALLERY=1 (jamais sur Vercel).
 */
export default function UiGalleryPage() {
  if (!isUiGalleryEnabled()) notFound();
  return (
    <ShellTitleProvider>
    <AppHeader />
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-4">
      <header className="flex flex-col gap-1">
        <p className="px-1 text-footnote uppercase tracking-wide text-ink-3">Développement · exemples fictifs</p>
        <PageTitle>Galerie UI</PageTitle>
      </header>

      <Section title="Typographie">
        <p className="text-large-title">Large title</p>
        <p className="text-title-2">Title 2</p>
        <p className="text-headline">Headline</p>
        <p className="text-body">Body — texte courant.</p>
        <p className="text-subhead text-ink-2">Subhead secondaire</p>
        <p className="text-footnote text-ink-3">Footnote tertiaire</p>
        <p className="text-caption text-ink-2">Caption</p>
      </Section>

      <Section title="Boutons">
        <Button size="lg">Action principale</Button>
        <div className="flex flex-wrap gap-2">
          <Button>Primaire</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="destructive">Destructif</Button>
          <Button disabled>Désactivé</Button>
        </div>
        <div className="flex gap-2">
          <IconButton aria-label="Explorer">
            <Compass aria-hidden />
          </IconButton>
          <IconButton aria-label="Sécurité" tone="accent">
            <Shield aria-hidden />
          </IconButton>
        </div>
      </Section>

      <Section title="Champs">
        <TextField label="Pseudo" placeholder="ex. joueur_10" hint="3 à 20 caractères." />
        <TextField label="Gamertag EA" defaultValue="Exemple" error="Format invalide (exemple d'erreur)." />
        <TextArea label="Présentation" counter="0/280" maxLength={280} />
      </Section>

      <Section title="Chips et badges">
        <div className="flex flex-wrap gap-2">
          <Chip selected>ST</Chip>
          <Chip>CAM</Chip>
          <Chip>PS5</Chip>
          <Badge>déclaré</Badge>
          <Badge tone="accent">3</Badge>
          <Badge tone="danger">!</Badge>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-3">
          <Avatar alt="" fallback="ab" size={32} />
          <Avatar alt="" fallback="cd" size={48} />
          <Avatar alt="" fallback="ef" size={96} />
        </div>
      </Section>

      <Section title="États">
        <InlineStatus kind="success">Enregistré (confirmé par le serveur).</InlineStatus>
        <InlineStatus kind="error">Impossible d&apos;enregistrer. Réessaie.</InlineStatus>
        <InlineStatus kind="info">Information contextuelle.</InlineStatus>
        <EmptyState icon={<Compass />} title="Rien pour l'instant" description="Explication de la cause et action utile." action={<Button size="lg">Action utile</Button>} />
        <Skeleton className="h-16 w-full" />
      </Section>

      <ListSection title="Liste groupée" footer="Lignes ≥ 44 px, filets fins.">
        <ListRow href="/dev/ui" icon={<UserRound />} label="Ligne avec lien" detail="Détail secondaire" />
        <ListRow icon={<Bell />} label="Ligne statique" value="Valeur" />
        <ListRow icon={<LogOut />} label="Action destructive" tone="destructive" />
      </ListSection>

      <Section title="Panneaux inférieurs">
        <GallerySheets />
      </Section>

      <Section title="LIVE (galerie uniquement)">
        <div className="flex items-center gap-3">
          <LivePill />
          <LivePill detail="42 min" />
        </div>
        <LiveHalo className="bg-surface-2 p-4">
          <p className="text-headline">Carte LIVE d&apos;exemple</p>
          <p className="text-subhead text-ink-2">Halo statique, une pulsation à l&apos;apparition.</p>
        </LiveHalo>
      </Section>
    </main>
    <TabBar />
    </ShellTitleProvider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="px-1 text-footnote uppercase tracking-wide text-ink-3">{title}</h2>
      <div className="flex flex-col gap-3 rounded-hero bg-surface-1 p-4">{children}</div>
    </section>
  );
}
