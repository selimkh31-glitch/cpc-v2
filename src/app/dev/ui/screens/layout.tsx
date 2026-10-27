import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { ShellTitleProvider } from "@/components/layout/shell-title";
import { TabBar } from "@/components/layout/tab-bar";
import { isUiGalleryEnabled } from "@/lib/dev/gallery";

/** Galerie (P2-A) : reproduit exactement la structure du shell `(app)/layout.tsx`, sans garde d'auth. */
export default function GalleryScreensLayout({ children }: { children: React.ReactNode }) {
  if (!isUiGalleryEnabled()) notFound();
  return (
    <ShellTitleProvider>
      <AppHeader />
      <div id="contenu" className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))]">{children}</div>
      <TabBar />
    </ShellTitleProvider>
  );
}
