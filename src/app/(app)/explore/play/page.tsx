import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { PageTitle } from "@/components/layout/shell-title";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { requireOnboardedUser } from "@/lib/auth/session";

/** D-47 : garder Jouer visible sans afficher de fausses sessions LIVE. */
export default async function ExplorePlayPage() {
  await requireOnboardedUser("/explore/play");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-8 pt-4">
      <PageTitle>Explorer</PageTitle>
      <SegmentedControl
        label="Choisir ce que tu recherches"
        items={[
          { href: "/explore/play", label: "Jouer", active: true },
          { href: "/explore/clubs", label: "Clubs", active: false },
        ]}
      />
      <EmptyState icon={<Gamepad2 />} title="Aucune session ouverte pour l'instant"
        description="Aucune session LIVE n'est actuellement disponible sur CPC."
        action={<Button asChild variant="secondary" size="lg"><Link href="/explore/clubs">Découvrir des clubs</Link></Button>} />
    </main>
  );
}
