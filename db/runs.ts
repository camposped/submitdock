import { desc, eq, isNull } from 'drizzle-orm'

import type { Db } from './connect'
import { runs, type Run } from './schema'

/**
 * The agent's "I am working on this" channel.
 *
 * Everything here is written by whatever is doing the work, not by the app, so
 * the panel in the sidebar reflects reality rather than a guess. A run left
 * open by a crash stays open on purpose: a stale spinner is a true statement
 * that something did not finish, and `sweepStaleRuns` closes those on demand.
 */
export function startRun(
  db: Db,
  label: string,
  options: { total?: number; productSlug?: string | null; step?: string } = {},
): number {
  const result = db
    .insert(runs)
    .values({
      label,
      step: options.step ?? null,
      done: options.total !== undefined ? 0 : null,
      total: options.total ?? null,
      startedAt: new Date().toISOString(),
      productSlug: options.productSlug ?? null,
    })
    .run()
  return Number(result.lastInsertRowid)
}

export function updateRun(
  db: Db,
  id: number,
  patch: { step?: string; done?: number; total?: number },
) {
  db.update(runs).set(patch).where(eq(runs.id, id)).run()
}

export function finishRun(db: Db, id: number, ok = true, step?: string) {
  db.update(runs)
    .set({ finishedAt: new Date().toISOString(), ok, ...(step ? { step } : {}) })
    .where(eq(runs.id, id))
    .run()
}

/** The run in flight, if any. Newest wins when something left two open. */
export function openRun(db: Db): Run | null {
  const [row] = db
    .select()
    .from(runs)
    .where(isNull(runs.finishedAt))
    .orderBy(desc(runs.id))
    .limit(1)
    .all()
  return row ?? null
}

export function recentRuns(db: Db, limit = 20): Run[] {
  return db.select().from(runs).orderBy(desc(runs.id)).limit(limit).all()
}

/** Closes runs a crash left open, so the panel stops claiming work is happening. */
export function sweepStaleRuns(db: Db, olderThanMinutes = 30): number {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000).toISOString()
  const stale = db
    .select()
    .from(runs)
    .where(isNull(runs.finishedAt))
    .all()
    .filter((run) => run.startedAt < cutoff)

  for (const run of stale) {
    db.update(runs)
      .set({ finishedAt: new Date().toISOString(), ok: false, step: 'Abandoned, nothing reported back' })
      .where(eq(runs.id, run.id))
      .run()
  }
  return stale.length
}
