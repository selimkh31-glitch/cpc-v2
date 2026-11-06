import Link from "next/link";
import { buttonClasses } from "@/components/ui/button-styles";

/** Pagination explicite : aucune requête infinie ou donnée fictive. */
export function LoadMore({ href, label = "Afficher plus de clubs" }: { href: string | null; label?: string }) {
  if (!href) return null;
  return (
    <Link href={href} className={buttonClasses({ variant: "secondary", size: "lg", className: "w-full text-center" })}>
      {label}
    </Link>
  );
}
