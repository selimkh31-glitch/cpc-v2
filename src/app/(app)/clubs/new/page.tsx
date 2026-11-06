import { randomUUID } from "node:crypto";
import Link from "next/link";
import { CreateClubWizard } from "@/features/clubs/components/create-club-wizard";
import { PageTitle } from "@/components/layout/shell-title";
import { StatePanel } from "@/components/states/state-panel";
import { requireOnboardedUser } from "@/lib/auth/session";

const ERROR_TEXT: Record<string, string> = {
  VALIDATION: "Les informations du club ne sont pas valides.",
  CONFLICT: "Ce nom de club est déjà pris ou la requête a changé. Choisis un autre nom.",
  LIMIT_REACHED: "Tu as déjà deux affiliations actives. Tu ne peux pas créer un autre club.",
  RATE_LIMITED: "Tu as déjà créé un club au cours des dernières 24 heures.",
  FORBIDDEN: "La création de club n’est pas autorisée pour ce compte.",
  UNKNOWN: "La création n’a pas abouti. Réessaie.",
};

export default async function NewClubPage({ searchParams }: PageProps<"/clubs/new">) {
  await requireOnboardedUser("/clubs/new");
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERROR_TEXT[params.error] : null;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-8 pt-4">
      <div className="flex flex-col gap-2">
        <Link href="/profile" className="w-fit min-h-11 text-subhead text-ink-2">Retour au profil</Link>
        <PageTitle>Créer un club</PageTitle>
        <p className="text-subhead text-ink-2">Trois étapes pour ouvrir ton espace Clubs.</p>
      </div>
      {error ? <StatePanel kind="error" title={error} /> : null}
      <CreateClubWizard requestId={randomUUID()} />
    </main>
  );
}
