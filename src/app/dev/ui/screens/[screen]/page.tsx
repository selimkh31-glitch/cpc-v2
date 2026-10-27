import { notFound } from "next/navigation";
import { HomeView } from "@/features/home/components/home-view";
import { ProfileView } from "@/features/profiles/components/profile-view";
import type { OwnProfile } from "@/features/profiles/queries";
import { isUiGalleryEnabled } from "@/lib/dev/gallery";

export const metadata = { title: "Galerie écrans (développement)", robots: { index: false, follow: false } };

/** Données d'exemple FICTIVES (galerie de développement uniquement, jamais en base ni sur Vercel). */
const FIXTURE: OwnProfile = {
  id: "00000000-0000-0000-0000-000000000000",
  handle: "exemple_10",
  platform: "ps5",
  mainPosition: "CAM",
  secondaryPositions: ["CM", "ST"],
  bio: "Exemple de présentation fictive pour la galerie.",
  eaGamertag: "Exemple_EA",
  avatarPath: null,
};

export default async function GalleryScreen({ params, searchParams }: PageProps<"/dev/ui/screens/[screen]">) {
  if (!isUiGalleryEnabled()) notFound();
  const { screen } = await params;
  const query = await searchParams;
  // Délai facultatif (?delay=ms) : reproduit le streaming d'un écran réel derrière loading.tsx.
  const delay = Math.min(Number(query.delay ?? 0) || 0, 3000);
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  if (screen === "home") return <HomeView profile={FIXTURE} avatarUrl={null} />;
  if (screen === "profile") {
    return <ProfileView profile={FIXTURE} avatarUrl={null} saved={query.saved === "presentation" ? "presentation" : null} error={null} />;
  }
  notFound();
}
