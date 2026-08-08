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

Assessment 1 is frontend only - it does not include a database or dynamic
word-list management. Those features are introduced in later assessments.

## Pages

- **Home** - project introduction and links to the two builders
- **About** - project description, student details, and a video walkthrough
- **Wordle** - configure a phoneme-based word, difficulty, hint visibility
  and guess count; preview it as a playable guessing game; download it as a
  standalone HTML activity
- **Word Search** - configure a phoneme word bank, difficulty and grid size;
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

## Tech Stack

- [Next.js](https://nextjs.org) (App Router)
- TypeScript
- Tailwind CSS
- ESLint

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the app.

### Adding the About page video

Place the recorded walkthrough video at `public/about-video.mp4` (this file is
not committed to the repository). The About page will pick it up automatically.

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run start` - run the production build
- `npm run lint` - run ESLint
