import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRound } from "lucide-react";
import { PageTitle } from "@/components/layout/shell-title";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button-styles";
import { Chip } from "@/components/ui/chip";
import { ListRow, ListSection } from "@/components/ui/list";
import type { OwnProfile } from "@/features/profiles/queries";

/**
 * Accueil (ACC-01, compte sans club ni session). Une seule action dominante (Explorer) et des blocs
 * secondaires véridiques : identité réelle du joueur. Aucun Radar, club ni suggestion inventés —
 * ils arrivent avec leurs lots (P2-C, P2-G, P2-J).
 */
export async function HomeView({ profile, avatarUrl }: { profile: OwnProfile | null; avatarUrl: string | null }) {
  const t = await getTranslations("appHome");
  const tRef = await getTranslations("onboarding");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <PageTitle>{t("title")}</PageTitle>

      {profile ? (
        <section aria-label={profile.handle} className="flex items-center gap-4 rounded-hero bg-surface-1 p-5">
          <Avatar src={avatarUrl} alt="" fallback={profile.handle} size={48} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <p className="truncate text-headline">{t("greeting", { handle: profile.handle })}</p>
            <div className="flex flex-wrap gap-1.5">
              <Chip selected>{profile.mainPosition}</Chip>
              <Chip>{tRef(`platforms.${profile.platform}`)}</Chip>
            </div>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="home-activity" className="flex flex-col gap-4 rounded-hero bg-surface-1 p-5">
        <div className="flex flex-col gap-1.5">
          <h2 id="home-activity" className="text-title-2">{t("activityTitle")}</h2>
          <p role="status" className="text-subhead text-ink-2">{t("empty")}</p>
        </div>
        <Link href="/explore" className={buttonClasses({ size: "lg" })}>
          {t("explore")}
        </Link>
      </section>

      <ListSection title={t("shortcuts")}>
        <ListRow href="/profile" icon={<UserRound />} label={t("profileShortcut")} detail={t("profileShortcutDetail")} />
      </ListSection>
    </main>
  );
}
