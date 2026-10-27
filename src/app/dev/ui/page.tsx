import { notFound } from "next/navigation";
import { Compass, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { InlineStatus } from "@/components/ui/inline-status";
import { Skeleton } from "@/components/ui/skeleton";
import { TextArea, TextField } from "@/components/ui/text-field";
import { isUiGalleryEnabled } from "@/lib/dev/gallery";

export const metadata = { title: "Galerie UI (développement)", robots: { index: false, follow: false } };

/**
 * Galerie de développement du design system (P2-A, docs/23). Contenus d'exemple, sans donnée réelle,
 * servant aux captures et à la revue. Introuvable hors ENABLE_UI_GALLERY=1 (jamais sur Vercel).
 */
export default function UiGalleryPage() {
  if (!isUiGalleryEnabled()) notFound();
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 pb-16 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
      <header className="flex flex-col gap-1">
        <p className="text-footnote uppercase tracking-wide text-ink-3">Développement · exemples fictifs</p>
        <h1 className="text-large-title">Galerie UI</h1>
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
    </main>
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
