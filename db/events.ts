import type { Db } from './connect'
import { events, type Actor } from './schema'

export type LogEventInput = {
  action: string
  actor?: Actor
  productSlug?: string | null
  domain?: string | null
  detail?: unknown
  ok?: boolean
}

/**
 * Every write of consequence lands here. The panel reads this table to answer
 * "what has the agent done", so a script that skips it is invisible.
 */
export function logEvent(db: Db, input: LogEventInput) {
  db.insert(events)
    .values({
      at: new Date().toISOString(),
      actor: input.actor ?? 'agent',
      action: input.action,
      productSlug: input.productSlug ?? null,
      domain: input.domain ?? null,
      detail: JSON.stringify(input.detail ?? {}),
      ok: input.ok ?? true,
    })
    .run()
}
