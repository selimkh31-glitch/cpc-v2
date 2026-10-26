import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 px-4 py-12">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p>{t("status")}</p>
      <p className="text-sm opacity-70">{t("notice")}</p>
      <footer className="mt-6 flex flex-wrap gap-x-4 text-sm">
        <Link href="/legal/terms" className="inline-flex min-h-11 items-center underline">{t("legalTerms")}</Link>
        <Link href="/legal/privacy" className="inline-flex min-h-11 items-center underline">{t("legalPrivacy")}</Link>
        <Link href="/legal/support" className="inline-flex min-h-11 items-center underline">{t("legalSupport")}</Link>
      </footer>
    </main>
  );
}
