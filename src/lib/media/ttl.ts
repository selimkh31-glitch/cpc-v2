/** ADR-0015 §2 : TTL des URL signées — 10 min par défaut, plafonné à 15 min (S9), plancher 60 s. */
export const DEFAULT_SIGNED_URL_TTL = 600;
export const MAX_SIGNED_URL_TTL = 900;
const MIN_SIGNED_URL_TTL = 60;

export function signedUrlTtl(raw: string | undefined = process.env.MEDIA_SIGNED_URL_TTL): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return DEFAULT_SIGNED_URL_TTL;
  return Math.min(Math.max(n, MIN_SIGNED_URL_TTL), MAX_SIGNED_URL_TTL);
}

/** ADR-0015 §4 : ≤ 2 Mo, PNG / JPEG / WebP uniquement (SVG interdit). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_MIME_TO_EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;
export type AvatarMime = keyof typeof AVATAR_MIME_TO_EXT;

export function avatarExtension(mime: string): (typeof AVATAR_MIME_TO_EXT)[AvatarMime] | null {
  return Object.hasOwn(AVATAR_MIME_TO_EXT, mime) ? AVATAR_MIME_TO_EXT[mime as AvatarMime] : null;
}

/** Signature réelle du fichier (l'en-tête MIME du navigateur n'est pas une preuve). */
export function sniffImageMime(bytes: Uint8Array): AvatarMime | null {
  const b = (i: number) => bytes[i] ?? -1;
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return "image/png";
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if (b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 && b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50) return "image/webp";
  return null;
}
