# SubmitDock, working notes

Read `README.md` first for what this is, and `AGENTS.md` for running a campaign.

## This repo is public

Nothing machine-specific may be committed. Two rules keep it that way:

- The database is gitignored; only `data/catalog.export.json` is tracked.
- Anything personal lives in a gitignored `*.local.json` twin with a committed
  `*.example.json` showing the shape. `scripts/seed-products.ts` is the pattern.

The test suite must pass on a fresh clone. `tests/seed.test.ts` proves the merge rules
against an in-repo fixture for exactly that reason; only the suite asserting the real
crawl's exact counts is gated behind `SUPAPIN_SEED`, because that file is not here.

The marketing site lives in a separate private repo and is not part of this one.

## Next.js

The installed version is 16.3.1 and it has breaking changes against most training
data. Read the relevant guide in `node_modules/next/dist/docs/` before writing route,
cache or server action code. In particular:

- `params`, `searchParams`, `cookies()` and `headers()` are async only, no sync fallback
- Turbopack is the default for `dev` and `build`, no flag
- `revalidateTag` takes a second argument now; server actions here use `refresh()`
  from `next/cache` instead, since every page is `force-dynamic` over a local file
- `next typegen` generates the `PageProps<'/route'>` helpers; run it after adding a route

## Conventions

- **No em dash in anything shown on screen.** Copy, UI, error messages. Comma, colon,
  full stop or parentheses instead. Minus signs in numbers are fine, code comments are exempt.
- Clickable tiles and cards get `cursor-pointer`.
- The primary action of a form or modal is right aligned (`flex justify-end`).
- Speed over ceremony. Tests exist only where being wrong is expensive: the seed
  (idempotence, dedupe across sources) and `verify.ts`. Do not TDD the whole app.
- Commit at the end of a block of work, not after each step.

## Design system

The interface comes from **one-boilerplate**
(github.com/camposped/one-boilerplate). Its `docs/design-system.md` is the source of
truth; the rules that bind here:

- **One accent.** `--primary` in `app/globals.css` is the only colour that changes per
  product; `--ring`, `--chart-1` and `--sidebar-ring` follow it. Do not invent a second
  saturated colour with its own meaning.
- **Every neutral has chroma 0.** A tinted gray changes the temperature of the whole app.
- `--good` / `--bad` / `--info` are the pastel semantic tones, and here they mean:
  good is a confirmed backlink, bad is a missing one or a dead domain, info is a marker.
- Light is the default; dark is a manual choice on `data-theme`, persisted in
  localStorage by `components/theme-script.tsx`, never inferred from the OS.
- Screens that can be empty use `components/screen-empty-state.tsx` with one concrete
  next action, never a bare paragraph.
- Page anatomy is the boilerplate's: `Reveal` wrapper, `max-w-5xl` column, `h1` plus a
  one-line purpose, `Card` sections, KPI values in `tabular-nums`.
- A section with a sub-rail follows the boilerplate's settings shell: a 232px rail, a
  `MobileRailPicker` standing in below `md`, and `max-w-3xl` content. `/product` is the
  only one so far. Entering it folds the main sidebar to icons and leaving it opens it
  again, matching what the boilerplate does for `/settings`.
- **Scrolling belongs to the page, never to the app shell.** The `(app)` layout is a
  non-scrolling flex column on purpose: a sub-rail inside a scroller drifts with the
  content. Single-column pages wrap their `Reveal` in `min-h-0 flex-1 overflow-y-auto`;
  a railed section puts that on its content column instead.

Deviations from the boilerplate, both deliberate:

1. `/catalog` uses `max-w-7xl` instead of `max-w-5xl`. It is a 367-row table, not a
   tiles-and-chart screen, and the reading column strangles it.
2. `components/ui/reveal.tsx` picks its IntersectionObserver threshold by height. The
   boilerplate hardcodes `0.15`, which an element taller than the viewport can never
   satisfy, so a long page stays at `opacity-0` forever. Worth porting back.

Ported components live where the boilerplate keeps them, so a future re-sync is a
copy. `components/copy-field.tsx` is the boilerplate's read-only value row;
`components/kit-field.tsx` is this product's editable field with a copy button.

## Brand

Source art is in `public/brand/`: the wordmark (SVG, 443x96), the ideogram (SVG,
154x100) and the app icon as a tile (PNG, 250px), each in a black and a white file.

`components/logo.tsx` loads none of them. The black and white files of each SVG are
one path differing only in `fill`, so each path is inlined once and filled with
`currentColor`: one asset, correct in both themes, and correct anywhere the mark is
deliberately muted. If the art changes, regenerate the path from the new SVG.

`Wordmark` is the expanded rail, `Mark` is the ideogram on the collapsed one. The tile
PNGs are raster and survive only as the favicon source, where CSS cannot recolour
anything anyway.

Favicons use Next's file conventions in `app/`:

- `icon.svg` is the one modern browsers use. It is the ideogram on a transparent
  ground, flipping fill under `prefers-color-scheme`, which follows the **OS**, not
  SubmitDock's `data-theme` toggle. That is the right target: the tab strip is painted
  by the browser, so contrast against the chrome is what matters, and the page has no
  say in it anyway.
- `favicon.ico` is the fallback for anything that will not take an SVG, multi-size from
  Pillow so browsers get a real 16px rather than a downscaled 250px.
- `apple-icon.png` stays raster because Safari's touch icon has to be.

The ico and the apple icon come from the white tile, black letters on white, which
reads on either chrome without needing a media query.

## Charts

There is one, the outcome donut on the dashboard (`components/outcome-donut.tsx`).

Its slices are **mutually exclusive**, and that is not a style choice. It replaced a
funnel whose stages were nested (submitted contains live contains confirmed), which is
fine as bars and impossible as a pie: four submissions would have drawn nine slices.
`getCampaignStats` buckets every attempted row into exactly one of confirmed / waiting
/ dead end so the slices sum to the ring. The conversion rates the funnel used to carry
are still there, as the sentence under it.

Colour comes from `--outcome-confirmed`, `--outcome-waiting` and `--outcome-failed`,
which are the good/info/bad hues re-stepped for a chart: chroma over the validator's
floor and lightness inside each mode's band. All six checks of the dataviz validator
pass against the card surface in both themes. **Re-run it before touching any of the
three**, do not hand tune. Dark is its own set of steps, not a flip of light.

Identity is never colour alone: every slice carries an icon and a label in the legend,
and the same holds for the status tags in `components/submission-status.tsx`.

## How a directory is judged

Three columns, and they are not the same thing:

- **`tier`** is my own opinion, a/b/c, with no rubric behind it. It came from the
  original brief and only 33 rows carry one, all from the supapin crawl. Treat it as an
  override, not as data.
- **`dr`** is Domain Rating, 0 to 100, third party authority. Objective, and the reason
  tier can stay an override. Populated from the Score column of the rushout09 README,
  which the first seed was throwing away: 161 of 367 rows have one. Null means nobody
  has scored the domain, which is not the same as scoring it zero, and the UI says so.
  Filling the other 206 needs a real source (Ahrefs or Moz, both paid).
- **`linkRel`** is what the directory hands out, written by `verify.ts` whenever it
  confirms a link. It lives on the DIRECTORY, not on the submission, because "saashub
  gives dofollow" is catalog knowledge worth carrying to the next product, while
  `submissions.backlinkRel` is one product's result. That split is also why the catalog
  shows `linkRel` and Submissions shows `backlinkRel`.

## The agent, and how the app knows about it

SubmitDock is the copilot seat, not the driver. A coding agent working in this
directory fills the forms through the Claude in Chrome extension and writes the results
into the same SQLite file the app has open. `AGENTS.md` is the instruction sheet for
that agent; keep it true when this changes.

Because of that, **the UI never tells anyone to run a command.** No `npm run` appears
on a screen. If a screen wants work done, it says to ask the agent.

Two tables carry the picture:

- `events` is what already happened, append only.
- `runs` is what is still in flight. An open row has no `finishedAt`. The agent opens
  one before a batch and closes it after (`scripts/run.ts`, exposed as `npm run agent`),
  which is what lets the sidebar tell "working" from "crashed". A run left open by a
  crash stays open on purpose: a stale spinner is a true statement, and
  `npm run agent -- sweep` closes the abandoned ones.

`components/agent-activity.tsx` polls `/api/activity` rather than refreshing on a
timer. It compares a `stamp` and only calls `router.refresh()` when it moves, so a
screen full of rows re-renders because something happened and not because time passed.
The stamp covers the open run, the newest event, and an aggregate over `submissions`,
so an agent writing straight to the tables still moves the UI. Polling is 2s while a
run is open and 10s while nothing is.

## Timing an attempt, and the picture at the end of it

Two columns on `submissions` carry proof rather than claims.

`durationMs` is **measured, never reported**. `npm run submit -- begin` stamps
`attemptStartedAt` and `done` subtracts, so the number belongs to the tool. A single
command taking `--seconds` would be asking the agent how long it took, and an attempt
recorded without a `begin` is stored as null rather than guessed at. `lib/timing.ts`
then counts only the rows that carry one.

The dashboard's saving is the only figure on that screen that is an argument rather
than a count, so it shows its working: `MANUAL_MINUTES` is printed beside the result,
the agent's own time is subtracted rather than ignored, and untimed attempts are named
instead of filled in at an average. "You saved 4 hours" is the same genre of claim as
"submitted to 300 sites", which is the thing this product exists to distrust.

`screenshotPath` is the end state of the page, and `submit done --shot` copies the
file into `data/shots/<slug>/` rather than registering it where it lay: evidence a
temp file can overwrite is not evidence. It is served through the same `/api/asset`
gate as the brand art, which is why `isRegisteredAsset` checks submissions too, and
why `assetSrc` had to move to `lib/asset-src.ts`: `lib/assets.ts` is `server-only` and
the sheet is a client component.

## The campaign model

Three different things, which the first pass conflated:

- A **directory** is reachable or not (`status`) and has obstacles (`requires*`). "Needs
  you" is derived from those flags, so it is a **catalog view**, not a state. It used to
  be a screen called Blocked, which read as a submission status and is not one.
- A **submission** is product x directory and has a `state`, a listing URL and a
  backlink verdict. `/submissions` shows only the ones actually attempted, meaning a
  state was set or a listing URL pasted. A bare `todo` row exists the moment a sheet is
  saved, and calling that an attempt would fill the screen with nothing.
- An **event** is one write. `/agent-log` shows them raw; `/submissions` summarises the
  latest one per directory into the "What happened" column, which is where an HTTP 403
  from `verify.ts` surfaces.

Two rules keep that column honest. A raw action name is never printed, because it is a
database value and not a sentence (`components/submissions-table.tsx` maps the few a
person might see). And a `verify.*` failure is ignored once `lastVerifiedAt` is null,
which means the listing URL changed since: otherwise a row reports a problem that was
already dealt with. The Problem tab uses the same test, so the tab and the column can
never disagree.

Colour is `components/submission-status.tsx` and nothing else defines it. Only three
outcomes get a tone: confirmed (good), failed (bad), in flight (info). Everything else
is neutral, so a screen of forty rows shows the handful worth reading.

## Product assets

`products` carries four brand slots plus a screenshot gallery, all holding **absolute
filesystem paths**, not data URLs.

The four are `logoOnLight`, `logoOnDark`, `iconOnLight`, `iconOnDark`, named for the
background the artwork goes ON rather than for the colour of its ink. "Send us your
light logo" is the most reliably misread sentence in this job: half the world means
light ink, the other half means the file for a light page. The slot name answers it,
and `components/product-assets.tsx` reinforces it by painting each preview tile in the
surface that slot is for, so a white logo in the light slot looks as wrong as it is.
`lib/asset-fields.ts` holds the slot list and labels, shared by both sides because a
`'use server'` module may only export async functions.

Paths rather than data URLs, because the boilerplate's choice is right there and wrong
here: a directory form asks you to upload a FILE, so what the kit has to hand over is a
path you can paste into the macOS open dialog after Cmd+Shift+G.

Two ways in, both in `components/product-assets.tsx`:

- **Upload** copies the bytes into `data/assets/<slug>/` (gitignored) and registers that
  path. Name collisions get a `-2` suffix rather than overwriting.
- **Use a path** registers a file where it already is, without copying. That is the one
  to reach for when a product's brand art already lives in the product's own repo.

Previews go through `app/api/asset/route.ts`, because Next cannot serve a path outside
the project. That route is gated twice: the path must be one a product row currently
registers (`registeredAssetPaths()`), and the extension must be an image. Without the
first gate it is a file browser for the whole disk.

Removing an asset deletes the file only when it sits inside `data/assets`, which means
it is a copy this app made. Anything else is a file of yours that merely happens to be
registered, and unregistering it is not permission to delete it.

Assets save the moment they are picked, so their cards sit OUTSIDE the Product Kit's
form: HTML cannot nest forms. `updateProduct` deliberately carries none of the asset
columns, otherwise saving the text half would blank the picture half.

The sidebar's product switcher shows `iconOnLight`/`iconOnDark`, picked by CSS for the
same reason the brand mark is: the server does not know the theme. A product with only
one of the two shows that one in both, which beats a placeholder.

## Database

`db/connect.ts` opens the file with WAL on, so a CLI script can write while the app is
open. Scripts import from `db/connect`, the app imports from `db/index`. Never import
`db/index` or `lib/queries` from a client component: they are `server-only`.

Submission rows are created lazily, on first touch, so 367 x N empty rows never exist.

`lib/actions.ts` is a `'use server'` module, so it may only export async functions.
Constants and types belong somewhere else, which is why `lib/product-selection.ts` and
`lib/asset-fields.ts` exist.

The dev port is 3007, fixed in both `package.json` and `lib/product.config.ts`, per the
boilerplate's one-port-per-product rule so several products can run side by side.
