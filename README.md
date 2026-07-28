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

### Assessment 1 scope

- Home page - project introduction and links to the two builders
- About page - project description, student details, and a video walkthrough
- Wordle page - builder and preview for a single phoneme-based Wordle activity
- Word Search page - builder and preview for a phoneme-based word search
  (~5 words)
- Settings page - light/dark mode (stored in cookies) and layout preferences
- Global layout: header with hamburger/kebab menu, footer with
  copyright/name/student number/date
- Accessibility-compliant markup throughout, including phoneme hover hints
  (e.g. `/theta/` shown as `TH`, as in "thin")

Assessment 1 is frontend only - it does not include a database or dynamic
word-list management. Those features are introduced in later assessments.

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

## Available Scripts

- `npm run dev` - start the development server
- `npm run build` - build for production
- `npm run start` - run the production build
- `npm run lint` - run ESLint
