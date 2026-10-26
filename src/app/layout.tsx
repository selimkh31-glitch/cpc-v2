import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");
  return {
    title: t("name"),
    description: t("description"),
    applicationName: t("name"),
    appleWebApp: { capable: true, title: t("shortName"), statusBarStyle: "black-translucent" },
    icons: { apple: "/icons/apple-touch-icon.png" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // iPhone (PWA plein écran, barre d'état translucide) : le contenu s'étend sous les encoches ;
  // l'en-tête et la barre d'onglets compensent avec env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Rendu dynamique obligatoire : la CSP à nonce est appliquée au rendu serveur (ADR-0017).
  await connection();
  const locale = await getLocale();
  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        {/* use-credentials : le manifest doit être récupéré avec le cookie Vercel Authentication (Preview protégée). */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
