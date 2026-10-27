import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/**
 * Cadre des écrans d'authentification (docs/23 §4.3) : centré verticalement, marque CPC sobre,
 * safe areas iPhone. Aucun logo inventé : la marque est le nom de l'application.
 */
export async function AuthShell({ title, children, footer, className }: { title: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  const t = await getTranslations("app");
  return (
    <main className={cn("mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))]", className)}>
      <div className="flex flex-1 flex-col justify-center gap-7">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-subhead font-semibold text-ink-2">
            <span aria-hidden className="size-2 rounded-full bg-accent" />
            {t("name")}
          </p>
          <h1 className="text-large-title">{title}</h1>
        </div>
        {children}
      </div>
      {footer ? <div className="pt-8">{footer}</div> : null}
    </main>
  );
}
