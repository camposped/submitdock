import { readFile, stat } from 'node:fs/promises'

import { contentTypeFor, isRegisteredAsset } from '@/lib/assets'

/**
 * Serves a product asset to an <img>.
 *
 * The kit points at files anywhere on this machine (brand art usually lives in
 * the product's own repo), so previewing them means reading an absolute path.
 * Two gates keep that from being a disk browser: the path has to be one a
 * product row currently registers, and the extension has to be an image.
 */
export async function GET(request: Request) {
  const filePath = new URL(request.url).searchParams.get('p')
  if (!filePath) return new Response('Missing path', { status: 400 })

  if (!isRegisteredAsset(filePath)) {
    return new Response('Not a registered product asset', { status: 403 })
  }

  const contentType = contentTypeFor(filePath)
  if (!contentType) return new Response('Not an image', { status: 415 })

  try {
    const info = await stat(filePath)
    if (!info.isFile()) return new Response('Not a file', { status: 404 })

    const body = await readFile(filePath)
    return new Response(new Uint8Array(body), {
      headers: {
        'content-type': contentType,
        'content-length': String(info.size),
        // The path is the cache key and the file behind it can be replaced in
        // place, so revalidate rather than trusting a stale thumbnail.
        'cache-control': 'no-cache',
      },
    })
  } catch {
    return new Response('That file is no longer on disk', { status: 404 })
  }
}
