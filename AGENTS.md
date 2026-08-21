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

## Time every attempt, and take a picture of the end of it

Wrap each directory in `submit begin` and `submit done`. The pair is how the
clock gets measured rather than reported: `begin` stamps the row, `done`
subtracts. Never estimate a duration, and never pass one in.

```bash
npm run --silent submit -- begin saashub.com --product northwind
# fill the form in Chrome
npm run --silent submit -- done saashub.com --product northwind --state submitted \
  --shot /tmp/saashub.png --listing-url https://www.saashub.com/northwind
```

`done` takes a screenshot path and copies the file into `data/shots/`, so the
picture survives whatever temp file you captured it into. Take one **whether
the submission worked or not**: a "thanks, we will review it" screen and a
"this field is required" screen are both worth more than your description of
them, and the failure shot is the one Pedro will actually want.

```bash
npm run --silent submit -- done techinasia.com --product northwind --state todo \
  --shot /tmp/tia.png --note "Editorial picks only, not an open directory"
```

On macOS, `screencapture -x /tmp/shot.png` writes the current screen to disk.
An attempt recorded without `begin` is stored as untimed rather than guessed
at, which is correct: the dashboard names those instead of averaging them in.

## Leave the directory better than you found it

An attempt teaches you things about the DIRECTORY that outlive the product you
were submitting. Write them down with `--playbook` and the next agent, on the
next product, starts where you finished.

```bash
npm run --silent submit -- done saashub.com --product northwind --state live \
  --shot /tmp/s.png \
  --note "Claimed an existing listing rather than creating one" \
  --playbook "/submit is a marketing list of other directories, not the form. The form is /services/submit. Cloudflare blocks verify.ts with a 403, so read the link rel in the browser."
```

`--note` and `--playbook` are not the same field and the difference matters:

| | goes to | about | audience |
|---|---|---|---|
| `--note` | the submission | this product's attempt | Pedro, on this campaign |
| `--playbook` | the directory | the site itself | the next agent, on the next product |

Worth writing: a submit URL that lies, a field with a hidden length limit, a
form that clears its file input on error, a captcha that passes on its own, a
listing that already existed, a required consent with a catch, whether
`verify.ts` can even reach the domain. Not worth writing: that your submission
was accepted.

It ships in `data/catalog.export.json` and is **published**, so keep it about
the site: no product names, no personal data, no credentials. Overwrite freely,
it is one field per domain and the newest reading wins.

## A pass

0. Work the catalog Pedro has selected. The prompt names it, and the app is scoped to
   it: the counts on the dashboard and the rows on the catalog screen are that list,
   not every domain the database knows.
1. Read the catalog for what to take next. Filter to alive, has a form, nothing
   blocking, untouched. It is ranked by Authority Score, so work down from the top.
2. Read the Product Kit for the answers: descriptions in three lengths, four brand
   files, screenshots, and the social profiles. The asset columns hold absolute paths,
   which is what a file upload dialog needs. Socials are stored as handles; the Social
   tab shows the URL beside each one, so paste whichever the form asks for.
3. Open the directory in Chrome, fill the form, submit.
4. Write the result with `submit done`: the state, the listing URL if the directory
   gave you one, and the screenshot of where you ended up.
5. Anything you could not finish stays `todo` with a note saying why. Do not mark
   something submitted that was not.
6. When listings have had time to appear, run `npm run verify` to check whether a real
   link is on each page and whether it is dofollow. That is the number this exists for.

## Rules

- **Never invent a result.** If you could not tell whether a submission went through,
  say so in the note. A wrong `live` is worse than an empty row, because it silently
  inflates the only number Pedro trusts. The same goes for the clock: an untimed
  attempt is a fact, a plausible-looking duration is a lie the dashboard adds up.
- **Log an event for anything of consequence** (`db/events.ts`). The Agent Log screen
  and the "What happened" column both read it, and a write with no event is invisible.
- **Do not touch the curated columns** on `directories`: `tier`, `categories`, `price`
  and `notes` are Pedro's, not yours. `playbook` is the one column on that table you
  do own, and `linkRel` is written by `verify.ts`.
- **No em dash in anything that reaches the screen**, including notes you write into
  the database. Comma, colon or full stop.
- A captcha, a social login or a fee is not yours to solve. Leave the row and let it
  show up in the catalog's Needs you view.
