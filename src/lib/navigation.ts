/** Onglet actif : correspondance exacte ou sous-route (ex. /profile/invitations active Profil). */
export function isTabActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
