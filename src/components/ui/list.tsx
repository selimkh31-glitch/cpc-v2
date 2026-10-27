import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Liste groupée (style iOS) : remplace les grandes cartes à bordure. Titre de section discret,
 * lignes ≥ 44 px séparées par des filets fins.
 */
export function ListSection({ title, footer, children, className }: { title?: string; footer?: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("flex flex-col gap-2", className)}>
      {title ? <h2 className="px-4 text-footnote uppercase tracking-wide text-ink-3">{title}</h2> : null}
      <ul className="overflow-hidden rounded-row bg-surface-1 [&>li+li>*]:hairline-t">{children}</ul>
      {footer ? <p className="px-4 text-footnote text-ink-3">{footer}</p> : null}
    </section>
  );
}

export const listRowClasses =
  "flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-body transition-colors duration-150 active:bg-surface-3";

type RowContentProps = { icon?: React.ReactNode; label: React.ReactNode; detail?: React.ReactNode; value?: React.ReactNode; chevron?: boolean; tone?: "default" | "destructive" | "accent" };

export function ListRowContent({ icon, label, detail, value, chevron, tone = "default" }: RowContentProps) {
  return (
    <>
      {icon ? (
        <span aria-hidden className={cn("flex size-8 shrink-0 items-center justify-center rounded-field bg-surface-2 [&_svg]:size-[1.125rem]", tone === "destructive" ? "text-danger" : "text-ink-2")}>
          {icon}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate", tone === "destructive" && "text-danger", tone === "accent" && "text-accent")}>{label}</span>
        {detail ? <span className="line-clamp-2 text-footnote text-ink-2">{detail}</span> : null}
      </span>
      {value ? <span className="max-w-[45%] truncate text-subhead text-ink-2">{value}</span> : null}
      {chevron ? <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" /> : null}
    </>
  );
}

/** Ligne de liste : lien (avec chevron), contenu statique, ou enfant interactif fourni (bouton, formulaire). */
export function ListRow({ href, children, ...content }: RowContentProps & { href?: string; children?: React.ReactNode }) {
  if (children) return <li>{children}</li>;
  if (href) {
    return (
      <li>
        <Link href={href} className={listRowClasses}>
          <ListRowContent chevron {...content} />
        </Link>
      </li>
    );
  }
  return (
    <li>
      <div className={cn(listRowClasses, "active:bg-transparent")}>
        <ListRowContent {...content} />
      </div>
    </li>
  );
}
