/**
 * The URL that renders a file from disk in an <img>.
 *
 * Its own module because both sides need it: `lib/assets.ts` is `server-only`
 * (it reads the database to build the allowlist), and the sheet and the kit
 * are client components. This half is a string template with no server in it,
 * so it can live where both can import it instead of being copied.
 */
export function assetSrc(filePath: string) {
  return `/api/asset?p=${encodeURIComponent(filePath)}`
}
