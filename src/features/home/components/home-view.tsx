import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { PageTitle } from "@/components/layout/shell-title";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button-styles";
import { Chip } from "@/components/ui/chip";
import type { OwnProfile } from "@/features/profiles/queries";

/**
 * Accueil (ACC-01, compte sans club ni session). Une seule action dominante (Explorer) et des blocs
 * secondaires véridiques : identité réelle du joueur. Aucun Radar, club ni suggestion inventés —
 * ils arrivent avec leurs lots (P2-C, P2-G, P2-J).
 * Finition P2-A : la carte d'identité mène au profil. Elle remplace l'ancien raccourci « Ton profil »,
 * qui faisait doublon avec l'onglet Profil ; le parcours vers le profil depuis l'Accueil est conservé.
 */
export async function HomeView({ profile, avatarUrl }: { profile: OwnProfile | null; avatarUrl: string | null }) {
  const t = await getTranslations("appHome");
  const tRef = await getTranslations("onboarding");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <PageTitle>{t("title")}</PageTitle>

      {profile ? (
        <Link href="/profile" data-testid="home-identity" className="flex items-center gap-4 rounded-hero bg-surface-1 p-5 transition-colors duration-150 active:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <Avatar src={avatarUrl} alt="" fallback={profile.handle} size={48} />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="truncate text-headline">{t("greeting", { handle: profile.handle })}</span>
            <span className="flex flex-wrap gap-1.5">
              <Chip selected>{profile.mainPosition}</Chip>
              <Chip>{tRef(`platforms.${profile.platform}`)}</Chip>
            </span>
            <span className="sr-only">{t("profileShortcut")}</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" />
        </Link>
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
    </main>
  );
}
