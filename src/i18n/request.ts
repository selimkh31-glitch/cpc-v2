import { getRequestConfig } from "next-intl/server";

/** D-16 / ADR-0010 : français seul au lancement, sans préfixe de locale dans l'URL. */
export const DEFAULT_LOCALE = "fr" as const;

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
