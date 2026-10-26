import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { StatePanel } from "@/components/states/state-panel";

export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t("notFoundTitle")}</h1>
      <StatePanel
        kind="empty"
        title={t("notFoundBody")}
        action={<Link href="/home" className="inline-flex min-h-11 items-center rounded-card border px-4">{t("backHome")}</Link>}
      />
    </main>
  );
}
