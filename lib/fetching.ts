/** A real browser UA. Plenty of directories 403 anything that admits to being a script. */
export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export const DEFAULT_HEADERS = {
  'user-agent': BROWSER_UA,
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
}

export type FetchPageResult = {
  ok: boolean
  status: number
  url: string
  html: string
  error?: string
}

export async function fetchPage(url: string, timeoutMs = 12_000): Promise<FetchPageResult> {
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const contentType = response.headers.get('content-type') ?? ''
    const html = /text\/|xml|json/i.test(contentType) ? await response.text() : ''
    return { ok: response.ok, status: response.status, url: response.url || url, html }
  } catch (error) {
    return { ok: false, status: 0, url, html: '', error: (error as Error).message }
  }
}

/** Bounded parallelism, because 350 simultaneous sockets gets you rate limited. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await worker(items[index], index)
    }
  })

  await Promise.all(runners)
  return results
}
