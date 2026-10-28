import { HomeView } from "@/features/home/components/home-view";
import { signedAvatarUrl } from "@/features/profiles/media";
import { getOwnProfile } from "@/features/profiles/queries";
import { requireOnboardedUser } from "@/lib/auth/session";

/** Accueil (ACC-01) : lecture RLS du profil, puis vue de présentation. */
export default async function HomePage() {
  const user = await requireOnboardedUser("/home");
  const profile = await getOwnProfile(user.userId);
  const avatarUrl = await signedAvatarUrl(profile?.avatarPath ?? null);
  return <HomeView profile={profile} avatarUrl={avatarUrl} />;
}
