import { openDb } from '../db/connect'
import { logEvent } from '../db/events'
import { finishRun, openRun, startRun, sweepStaleRuns, updateRun } from '../db/runs'

/**
 * How the agent tells SubmitDock what it is doing.
 *
 * The panel in the sidebar reads this, so a person watching the app can see
 * the work happen instead of wondering whether anything is running.
 *
 *   npm run agent -- start "Submitting Northwind to 12 directories" --total 12
 *   npm run agent -- step 3 "Filling the form on saashub.com" --done 2
 *   npm run agent -- finish 3
 *   npm run agent -- finish 3 --failed "Captcha would not solve"
 *   npm run agent -- status
 *
 * `start` prints the run id on its own line, which is what the other commands
 * take. Nothing here throws on a missing run: a status line is never worth
 * killing the actual work over.
 */
const [command, ...rest] = process.argv.slice(2)

function flag(name: string): string | undefined {
  const index = rest.indexOf(`--${name}`)
  if (index === -1) return undefined
  const value = rest[index + 1]
  return value && !value.startsWith('--') ? value : ''
}

/** Everything that is not a flag or a flag's value. */
function positionals(): string[] {
  const out: string[] = []
  for (let i = 0; i < rest.length; i += 1) {
    if (rest[i].startsWith('--')) {
      const next = rest[i + 1]
      if (next && !next.startsWith('--')) i += 1
      continue
    }
    out.push(rest[i])
  }
  return out
}

const db = openDb()
const args = positionals()
const number = (value: string | undefined) =>
  value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : undefined

switch (command) {
  case 'start': {
    const label = args[0]
    if (!label) {
      console.error('usage: npm run agent -- start "what you are doing" [--total 12] [--product northwind]')
      process.exit(1)
    }
    const id = startRun(db, label, {
      total: number(flag('total')),
      productSlug: flag('product') || null,
      step: flag('step'),
    })
    logEvent(db, { action: 'run.started', detail: { id, label }, productSlug: flag('product') || null })
    console.log(id)
    break
  }

  case 'step': {
    const id = number(args[0])
    if (id === undefined) {
      console.error('usage: npm run agent -- step <id> "what is happening now" [--done 3] [--total 12]')
      process.exit(1)
    }
    updateRun(db, id, {
      ...(args[1] ? { step: args[1] } : {}),
      ...(number(flag('done')) !== undefined ? { done: number(flag('done'))! } : {}),
      ...(number(flag('total')) !== undefined ? { total: number(flag('total'))! } : {}),
    })
    break
  }

  case 'finish': {
    const id = number(args[0])
    if (id === undefined) {
      console.error('usage: npm run agent -- finish <id> [--failed "why"]')
      process.exit(1)
    }
    const failed = flag('failed')
    finishRun(db, id, failed === undefined, failed || undefined)
    logEvent(db, { action: 'run.finished', ok: failed === undefined, detail: { id, failed } })
    break
  }

  case 'status': {
    const run = openRun(db)
    console.log(run ? `${run.id} running: ${run.label}${run.step ? ` (${run.step})` : ''}` : 'idle')
    break
  }

  case 'sweep': {
    const closed = sweepStaleRuns(db, number(flag('minutes')) ?? 30)
    console.log(`closed ${closed} abandoned run(s)`)
    break
  }

  default:
    console.error('commands: start, step, finish, status, sweep')
    process.exit(1)
}
