import { ProfileView } from "@/features/profiles/components/profile-view";
import { signedAvatarUrl } from "@/features/profiles/media";
import { getOwnProfile } from "@/features/profiles/queries";
import { requireOnboardedUser } from "@/lib/auth/session";

const SAVED = new Set(["presentation", "gamertag", "avatar", "avatar_removed"]);
const ERRORS = new Set(["presentation", "gamertag", "avatar_missing", "avatar_size", "avatar_type", "avatar_upload", "avatar_remove"]);

/** Profil personnel (PRO-01, S-1.9) : lecture RLS de son propre profil, puis vue de présentation. */
export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const user = await requireOnboardedUser("/profile");
  const [profile, params] = await Promise.all([getOwnProfile(user.userId), searchParams]);
  const avatarUrl = await signedAvatarUrl(profile?.avatarPath ?? null);
  const saved = typeof params.saved === "string" && SAVED.has(params.saved) ? params.saved : null;
  const error = typeof params.error === "string" && ERRORS.has(params.error) ? params.error : null;
  return <ProfileView profile={profile} avatarUrl={avatarUrl} saved={saved} error={error} />;
}
