import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

/**
 * Pages légales PROVISOIRES (S-1.11). Aucun contenu juridique définitif : l'entité éditrice (D-19)
 * n'est pas arbitrée. Chaque page l'indique explicitement et n'engage à rien.
 */
const DOCS = ["terms", "privacy", "support"] as const;
type Doc = (typeof DOCS)[number];
const isDoc = (v: string): v is Doc => (DOCS as readonly string[]).includes(v);

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  if (!isDoc(doc)) return {};
  const t = await getTranslations("legal");
  return { title: `${t(`${doc}.title`)} — ${t("draftBadge")}`, robots: { index: false } };
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();
  const t = await getTranslations("legal");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
      <p className="w-fit rounded-card border px-2 py-1 text-xs font-medium uppercase" data-testid="legal-draft">{t("draftBadge")}</p>
      <h1 className="text-2xl font-semibold">{t(`${doc}.title`)}</h1>
      <p role="note" className="rounded-card border border-foreground/15 p-3 text-sm">{t("draftNotice")}</p>
      <p className="text-sm opacity-80">{t(`${doc}.purpose`)}</p>
      <nav aria-label={t("navLabel")}>
        <ul className="flex flex-col">
          {DOCS.filter((d) => d !== doc).map((d) => (
            <li key={d}>
              <Link href={`/legal/${d}`} className="inline-flex min-h-11 items-center text-sm underline">{t(`${d}.title`)}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
