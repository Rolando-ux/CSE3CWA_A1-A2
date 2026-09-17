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
application. Both generators have been verified by saving their real output to
disk and opening it via a `file://` URL outside the dev server.

Assessment 1 delivered the frontend-only builder. Assessment 2 adds a backend,
database and API layer: teacher-managed word lists and activity configurations
are now stored in a database and served through CRUD API routes, and both
builders generate their activities from that stored data instead of a fixed
frontend dataset. The application is also containerised with Docker.

## Pages

- **Home** - project introduction and links to the two builders
- **About** - project description, student details, and a video walkthrough
- **Wordle** - pick a stored word list, configure hint visibility and guess
  count; preview it as a playable guessing game; download it as a standalone
  HTML activity
- **Word Search** - pick a stored word list, configure hints and grid size;
  generate and preview the puzzle (drag-to-select, or click/keyboard two-tap
  selection); download it as a standalone HTML activity
- **Settings** - light/dark theme, persisted via a cookie

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
- Responsive layout, verified down to a 375px mobile viewport including the
  largest (20x20) Word Search grid
- Word lists, phonemes and activity configurations are stored in a database
  and managed through CRUD API routes, rather than hard-coded in the
  frontend

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- Tailwind CSS
- [Prisma](https://www.prisma.io) ORM with SQLite
- ESLint
- Docker

## Database and API

The database schema (`prisma/schema.prisma`) models `WordList` -> `Word` ->
`WordPhoneme` (one row per phoneme, so multi-character IPA symbols like `tʃ`
or `æɪ` are stored safely) plus a `PhonemeSymbol` reference table and an
`Activity` table for saved Wordle/Word Search configurations.

API routes:

- `GET/POST /api/wordlists`, `GET/PATCH/DELETE /api/wordlists/[id]` - manage
  word lists (`?include=words` on the GET list route returns full word and
  phoneme data)
- `POST /api/wordlists/[id]/words` - add a word to a list
- `GET/PATCH/DELETE /api/words/[id]` - manage individual words
- `GET/POST /api/activities`, `GET/PATCH/DELETE /api/activities/[id]` -
  manage activity configurations
- `GET /api/health` - health check, returns `200 OK`

All write routes validate their input (non-empty text, recognised phoneme
symbols, phoneme count matching the word list's difficulty, valid
activity settings) and return clear JSON error messages on failure.

## Getting Started

Install dependencies:

```bash
npm install
```

Set up the database (creates `dev.db` and seeds it with the phoneme word
corpus):

```bash
npx prisma migrate dev
npm run db:seed
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

### Adding the About page video

Place the recorded walkthrough video at `public/about-video.mp4` (this file is
not committed to the repository). The About page will pick it up automatically.

## Running with Docker

The application can also be built and run in a Docker container:

```bash
docker compose up --build
```

This builds the image, runs the database migration and seed automatically on
container startup, and starts the app on
[http://localhost:3000](http://localhost:3000). Every container start
produces a fresh, reproducible database from the same seed data.

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run start` - run the production build
- `npm run lint` - run ESLint
- `npm run db:seed` - reset and reseed the database from the phoneme corpus
- `npm run db:view` - print a summary of the current database contents
