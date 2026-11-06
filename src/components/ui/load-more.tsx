import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Pagination explicite : l'URL contient le curseur signé/validé par le contrat. */
export function LoadMore({ href, label = "Afficher plus de clubs" }: { href: string | null; label?: string }) {
  if (!href) return null;
  return (
    <div className="flex justify-center py-3">
      <Button asChild variant="secondary">
        <Link href={href} rel="next">{label}</Link>
      </Button>
    </div>
  );
}
