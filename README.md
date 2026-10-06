# CSE3CWA - Phoneme Activity Builder

**Student Name:** Rolando Obanos Junior
**Student Number:** 21582762
**Subject:** CSE3CWA - Cloud Based Web Application

## Project Overview

This project is built for La Trobe University's CSE3CWA subject. It is a Next.js
(TypeScript) application that lets Speech Pathology teachers build phoneme-based
classroom activities - a Wordle-style guessing game and a Word Search puzzle -
preview them in the browser, and generate a standalone `.html` file for each
activity.

The generated HTML file is self-contained: downloading it and opening it in any
web browser will run the activity directly, with no dependency on this
application.

The project has been built in stages:

- **Assessment 1** - the frontend-only builder.
- **Assessment 2** - a backend, database and API layer. Teacher-managed word
  lists and activity configurations are stored in a database and served through
  CRUD API routes, and the application is containerised with Docker.
- **Assessment 3** - a data-driven dashboard with observability and reporting.
  Every generation attempt, page visit and change to stored data is recorded in
  the database, and the dashboard turns that into health status, alerts, key
  figures, charts and reports.

## Pages

- **Home** - project introduction and links to the builders and the dashboard
- **About** - project description, student details, and a video walkthrough
- **Wordle** - pick a stored word list, configure hint visibility and guess
  count; preview it as a playable guessing game; download it as a standalone
  HTML activity
- **Word Search** - pick a stored word list, configure hints and grid size;
  generate and preview the puzzle (drag-to-select, or click/keyboard two-tap
  selection); download it as a standalone HTML activity
- **Dashboard** - system health, alerts, key usage figures, charts, reports, and
  generation from saved activities (see below)
- **Settings** - light/dark theme, persisted via a cookie

## Dashboard (Assessment 3)

The dashboard (`/dashboard`) reads everything from the database through
`GET /api/stats`:

- **System health** - a Healthy/Unhealthy indicator with database response time
  and uptime, backed by the `/health` endpoint
- **Alerts** - raised for an unreachable database, a failure rate above 15%
  (over the last 7 days), empty word lists, repeated invalid input and no recent
  activity. Each alert shows an icon and a word, not colour alone
- **Key figures** - Wordle and Word Search activities created, word lists and
  words stored, most-used activity type, successful and failed generation
  counts, average time on page and average generation time
- **Generate from saved activities** - preview or download any saved activity
  using the settings stored in the database. Each attempt is logged against the
  activity, so the figures update
- **Charts** - generations per day (30 days), by activity type, and successful
  versus failed. Hand-built SVG with a text description and a table view for
  screen readers
- **Reports** - a filterable, paged table of every generation attempt with a CSV
  export, the reasons generations failed, time spent on each page, the stored
  word lists, and a feed of recent changes

### Simulated data

`npm run db:seed-usage` fills the usage tables with 30 days of simulated
records (generation attempts, page visits and builder actions) so the dashboard
has history to report on. It is deterministic for a given day and never creates
records dated in the future. Real usage is recorded alongside it.

## Features

- Header with hamburger menu, footer with copyright/name/student
  number/date, and a cookie that restores the last visited page on a fresh
  visit
- Phoneme hint keyboard shared across the Wordle and Word Search builders,
  with a mouse-over/keyboard-focus tooltip showing the English equivalent
  (e.g. `θ` -> "TH (as in thin)")
- WCAG AA colour contrast throughout, including the generated standalone
  activities
- Word Search grid is fully keyboard-operable (click/Enter two-tap
  selection) as well as pointer-drag, in both the builder and the
  downloaded activity
- Responsive layout down to a 375px mobile viewport
- Word lists, phonemes and activity configurations stored in a database and
  managed through CRUD API routes
- Activities are generated on the server, validated, and logged as successes or
  failures with a reason (for example "Word list is empty" or "Word does not
  fit in grid")

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- Tailwind CSS
- [Prisma](https://www.prisma.io) ORM with SQLite
- ESLint
- Docker
- [Playwright](https://playwright.dev) (end-to-end tests), [Apache JMeter](https://jmeter.apache.org)
  (load tests) and [Lighthouse](https://github.com/GoogleChrome/lighthouse) (accessibility and performance)

## Database and API

The database schema (`prisma/schema.prisma`) models `WordList` -> `Word` ->
`WordPhoneme` (one row per phoneme, so multi-character IPA symbols like `tʃ`
or `æɪ` are stored safely), a `PhonemeSymbol` reference table and an
`Activity` table for saved Wordle/Word Search configurations.

Three tables hold the observability data:

- `GenerationLog` - one row per generation attempt: activity type, success or
  failure, the failure reason, and how long it took. Deleting an activity keeps
  its history
- `PageSession` - one row per page visit: the page and the seconds spent on it
- `UsageEvent` - a timeline of activities and word lists being created, updated
  or deleted, and of invalid input being rejected

API routes:

- `GET/POST /api/wordlists`, `GET/PATCH/DELETE /api/wordlists/[id]` - manage
  word lists (`?include=words` on the GET list route returns full word and
  phoneme data)
- `POST /api/wordlists/[id]/words` - add a word to a list
- `GET/PATCH/DELETE /api/words/[id]` - manage individual words
- `GET/POST /api/activities`, `GET/PATCH/DELETE /api/activities/[id]` -
  manage activity configurations
- `POST /api/generate` - build a Wordle or Word Search HTML file, either from
  explicit settings or from a saved activity (`{ "activityId": 1 }`)
- `GET /api/stats` - every figure the dashboard shows
- `GET /api/reports/generations` - filterable, paged generation report
  (`?status=`, `?type=`, `?page=`, `?pageSize=`, `?format=csv`)
- `POST /api/metrics/session` - receives time-on-page reports from the browser
- `GET /health` (also `GET /api/health`) - health check, returns `200 OK` with
  database status and response time, or `503` if the database is unreachable

All write routes validate their input and return clear JSON error messages on
failure. Invalid input is also recorded as a usage event.

## Getting Started

Install dependencies:

```bash
npm install
```

Set up the database (creates `dev.db`, seeds the phoneme word corpus and saved
activities, then the simulated usage records):

```bash
npx prisma migrate dev
npm run db:seed
npm run db:seed-usage
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

### Adding the About page video

Place the recorded walkthrough video at `public/about-video.mp4` (this file is
not committed to the repository). The About page will pick it up automatically.

## Testing

Three kinds of testing are set up. All of them run against a **throwaway
database** (`test.db`) on port 3100, so they never touch the development data
(`dev.db`) or a dev server running on port 3000. The scripts for JMeter and
Lighthouse are written for Windows.

### End-to-end tests (Playwright)

```bash
npm install
npx playwright install chromium   # once: Playwright's own browser
npm run test:e2e                  # build, start a test server, run everything
npm run test:e2e:headed           # the same, with a visible browser window
npm run test:e2e:report           # open the HTML report of the last run
```

16 tests drive the real production build in a browser:

- **User use case** - a teacher builds a Wordle or Word Search and downloads it,
  then the test opens the *downloaded file* and plays it to the end (winning,
  losing, hints on and off, and a guess limit that carries into the file; a
  Word Search is solved by clicking, by dragging and by keyboard).
- **Builder use case** - create, read, update and delete a word list, a word and an
  activity, including invalid input being refused, with each change checked on
  the dashboard.
- **Dashboard** - health and key figures, the empty-word-list alert, generating
  from a saved activity, the failed-generation path, report filters and the CSV
  export.
- **Smoke tests** - every page loads, with no script errors or broken requests
  (the git-ignored About page video is the one allowed 404).

These tests found two real bugs in the downloaded Word Search, both now fixed
and covered by regression tests (`tests/e2e/generated-word-search.spec.ts`): mouse
clicks on a cell were lost because the grid was rebuilt before the click arrived,
and a word sharing its first or last cell with an already-found word could not
be selected by click or keyboard.

### Load tests (Apache JMeter)

`jmeter/phoneme-builder-load-test.jmx` simulates users who browse the builder,
create and delete an activity, generate a file from a saved activity, and load
the dashboard figures. `jmeter/run-load-test.ps1` runs it at 1, 10, 100, 1,000 and
10,000 virtual users, each against a fresh database, while recording the
server's CPU and memory.

```powershell
# needs Apache JMeter 5.6.3 (use -JMeterHome if it is not in C:\Users\<you>\tools)
powershell -ExecutionPolicy Bypass -File jmeter\run-load-test.ps1
node jmeter/summarize-results.mjs
```

| Users | Errors | Mean response | 95th percentile |
|---:|---:|---:|---:|
| 1 | 0% | 9 ms | 16 ms |
| 10 | 0% | 8 ms | 17 ms |
| 100 | 0% | 239 ms | 359 ms |
| 1,000 | 30% | 2,366 ms | 4,708 ms |
| 10,000 | 88% | 369 ms | 2,222 ms |

Up to 100 users the app answers without errors, but at 100 its single CPU core is
already full. Beyond that the operating system starts refusing connections; the
server never crashed, kept its data consistent, and recovered when the load
dropped. The full tables are in [`jmeter/RESULTS.md`](jmeter/RESULTS.md) and the
explanation in [`jmeter/ANALYSIS.md`](jmeter/ANALYSIS.md).

### Accessibility and performance (Lighthouse)

```bash
node lighthouse/run-lighthouse.mjs --label run   # all pages, mobile and desktop
node lighthouse/summarize.mjs before after       # compare two labelled runs
```

This builds the app, serves it on the throwaway database and runs Lighthouse
13.5.0 (fetched with `npx`) using Playwright's Chromium. **Accessibility scores
100 on every page, in mobile and desktop modes.** Lighthouse also found a
layout-shift problem (content pushing the footer around while the dashboard
loaded; 0.738 on desktop), which was fixed by reserving space while loading.
Results, including what the earlier accessibility fixes were worth, are in
[`lighthouse/RESULTS.md`](lighthouse/RESULTS.md).

## Running with Docker

The application can also be built and run in a Docker container:

```bash
docker compose up --build
```

This builds the image, runs the database migration and word-list seed
automatically on container startup, and starts the app on
[http://localhost:3000](http://localhost:3000). Every container start produces a
fresh database from the same seed data, so the usage statistics start empty
there.

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run start` - run the production build
- `npm run lint` - run ESLint
- `npm run db:seed` - reset and reseed the word lists and activities from the
  phoneme corpus
- `npm run db:seed-usage` - reset and reseed the simulated usage records
- `npm run db:view` - print a summary of the current database contents,
  including the usage statistics
- `npm run test:db` - build the throwaway test database (`test.db`)
- `npm run test:e2e` - run the Playwright end-to-end tests
- `npm run test:e2e:headed` - the same, in a visible browser
- `npm run test:e2e:report` - open the Playwright HTML report
