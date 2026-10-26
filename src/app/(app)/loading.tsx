import { getTranslations } from "next-intl/server";
import { PageSkeleton } from "@/components/states/skeleton";

export default async function AppLoading() {
  const t = await getTranslations("states");
  return <PageSkeleton label={t("loading")} />;
}
