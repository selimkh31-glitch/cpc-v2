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
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pb-10 pt-[calc(2rem+env(safe-area-inset-top))]">
      <p className="w-fit rounded-full bg-surface-3 px-3 py-1 text-caption uppercase tracking-wide text-ink-2" data-testid="legal-draft">{t("draftBadge")}</p>
      <h1 className="px-1 text-large-title">{t(`${doc}.title`)}</h1>
      <p role="note" className="rounded-row bg-surface-1 p-4 text-subhead text-ink">{t("draftNotice")}</p>
      <p className="px-1 text-body text-ink-2">{t(`${doc}.purpose`)}</p>
      <nav aria-label={t("navLabel")}>
        <ul className="overflow-hidden rounded-row bg-surface-1 [&>li+li>*]:hairline-t">
          {DOCS.filter((d) => d !== doc).map((d) => (
            <li key={d}>
              <Link href={`/legal/${d}`} className="flex min-h-12 items-center px-4 text-body active:bg-surface-3">{t(`${d}.title`)}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
