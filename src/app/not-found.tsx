import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonClasses } from "@/components/ui/button-styles";
import { StatePanel } from "@/components/states/state-panel";

export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <h1 className="px-1 text-large-title">{t("notFoundTitle")}</h1>
      <StatePanel kind="empty" title={t("notFoundBody")} action={<Link href="/home" className={buttonClasses({ size: "lg" })}>{t("backHome")}</Link>} />
    </main>
  );
}
