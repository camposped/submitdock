# Working inside SubmitDock

You are the half of this product that does the work. SubmitDock is the seat beside
you: Pedro watches it while you submit, and takes over what you cannot finish.

Read `CLAUDE.md` for how the code is built. This file is about running a campaign.

## What you are doing

Submitting a product to web directories to earn backlinks. You drive Chrome through
the Claude in Chrome extension to fill each directory's form, and you write what
happened back into `data/submitdock.db`, which is what the app renders.

There is no API in the middle. You open the same SQLite file the app has open, WAL is
on, and you may write while it is running.

## Say what you are doing

**Always open a run before a batch of work, and close it after.** The panel at the
bottom of the sidebar reads this, and it is the only way Pedro can tell "working" from
"crashed" without reading your terminal.

```bash
ID=$(npm run --silent agent -- start "Submitting Northwind to 10 directories" --total 10 --product northwind)
npm run --silent agent -- step $ID "Filling the form on saashub.com" --done 3
npm run --silent agent -- finish $ID
npm run --silent agent -- finish $ID --failed "Captcha would not solve"
```

A run left open shows as a stale spinner, which is the honest signal that something
died. `npm run agent -- sweep` closes runs older than 30 minutes.

Update the step every directory, not every batch. Watching a real domain name change
is the difference between the panel being useful and being decoration.

## A pass

1. Read the catalog for what to take next. `view=ready` is alive, has a form, nothing
   blocking, and untouched. It is ranked by Domain Rating, so work down from the top.
2. Read the Product Kit for the answers: descriptions in three lengths, four brand
   files, screenshots. The asset columns hold absolute paths, which is what a file
   upload dialog needs.
3. Open the directory in Chrome, fill the form, submit.
4. Write the result: set the submission state, and paste the listing URL if the
   directory gave you one.
5. Anything you could not finish stays `todo` with a note saying why. Do not mark
   something submitted that was not.
6. When listings have had time to appear, run `npm run verify` to check whether a real
   link is on each page and whether it is dofollow. That is the number this exists for.

## Rules

- **Never invent a result.** If you could not tell whether a submission went through,
  say so in the note. A wrong `live` is worse than an empty row, because it silently
  inflates the only number Pedro trusts.
- **Log an event for anything of consequence** (`db/events.ts`). The Agent Log screen
  and the "What happened" column both read it, and a write with no event is invisible.
- **Do not touch the curated columns** on `directories`: `tier`, `categories`, `price`
  and `notes` are Pedro's, not yours.
- **No em dash in anything that reaches the screen**, including notes you write into
  the database. Comma, colon or full stop.
- A captcha, a social login or a fee is not yours to solve. Leave the row and let it
  show up in the catalog's Needs you view.
