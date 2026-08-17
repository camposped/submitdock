import { desc, sql } from 'drizzle-orm'

import { db } from '@/db'
import { events, submissions } from '@/db/schema'
import { openRun } from '@/db/runs'

export const dynamic = 'force-dynamic'

/**
 * The cheap poll behind the sidebar's activity panel.
 *
 * Deliberately tiny: the client asks every few seconds and only calls
 * router.refresh() when `stamp` changes, so a page full of tables re-renders
 * when something actually happened rather than on a timer.
 */
export async function GET() {
  const run = openRun(db)
  const [latest] = db.select().from(events).orderBy(desc(events.id)).limit(1).all()

  // Events are the usual signal, but an agent writing straight to the tables
  // would not move them. This aggregate is cheap on a table this size and
  // catches a state change, a listing URL or a verdict landing on its own.
  const [work] = db
    .select({
      rows: sql<number>`count(*)`,
      lastId: sql<number>`coalesce(max(${submissions.id}), 0)`,
      touched: sql<string>`coalesce(max(coalesce(${submissions.lastVerifiedAt}, '') || coalesce(${submissions.submittedAt}, '') || ${submissions.state}), '')`,
    })
    .from(submissions)
    .all()

  return Response.json(
    {
      run: run
        ? {
            id: run.id,
            label: run.label,
            step: run.step,
            done: run.done,
            total: run.total,
            startedAt: run.startedAt,
          }
        : null,
      lastEvent: latest
        ? { id: latest.id, action: latest.action, at: latest.at, ok: latest.ok, domain: latest.domain }
        : null,
      // One value the client can compare. Covers both a run advancing and a
      // write landing with no run around it.
      stamp: [
        run?.id ?? 0,
        run?.step ?? '',
        run?.done ?? '',
        latest?.id ?? 0,
        work?.rows ?? 0,
        work?.lastId ?? 0,
        work?.touched ?? '',
      ].join(':'),
    },
    { headers: { 'cache-control': 'no-store' } },
  )
}
