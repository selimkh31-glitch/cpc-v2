import { PageSkeleton } from "@/components/states/skeleton";

/** Même frontière Suspense que le shell `(app)/loading.tsx` (rendu en streaming). */
export default function GalleryLoading() {
  return <PageSkeleton label="Chargement…" />;
}
