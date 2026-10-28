import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

/**
 * Cadre des écrans d'authentification (docs/23 §4.3) : marque CPC sobre, safe areas iPhone.
 * Centrage adaptatif décalé vers le haut : l'espace libre se répartit 1/3 au-dessus, 2/3 au-dessous,
 * et le vide supérieur est plafonné (12 dvh). Sur petit écran, les espaceurs se réduisent à zéro.
 * Aucun logo inventé : la marque est le nom de l'application.
 */
export async function AuthShell({ title, children, footer, className }: { title: string; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  const t = await getTranslations("app");
  return (
    <main className={cn("mx-auto flex min-h-dvh w-full max-w-sm flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]", className)}>
      <div aria-hidden data-testid="auth-top-spacer" className="max-h-[12dvh] flex-1" />
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-subhead font-semibold text-ink-2">
            <span aria-hidden className="size-2 rounded-full bg-accent" />
            {t("name")}
          </p>
          <h1 className="text-large-title">{title}</h1>
        </div>
        {children}
      </div>
      <div aria-hidden className="flex-[2]" />
      {footer ? <div className="pt-8">{footer}</div> : null}
    </main>
  );
}
