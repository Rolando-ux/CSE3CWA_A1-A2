# CSE3CWA - Cloud Based Web Application

**Student Name:** Rolando Obanos Junior
**Student Number:** 21582762
**Subject:** CSE3CWA - Cloud Based Web Application

## Project Overview

This project is built for La Trobe University's CSE3CWA subject. It is a Next.js
(TypeScript) application that generates standalone HTML5 + JavaScript + inline-CSS
code snippets (no CSS classes) intended for deployment on the Moodle LMS.

The generated code is self-contained: copying it into a blank `.html` file and
opening it in a browser will run it directly, with no dependency on this
application or any external stylesheet.

### Assignment 1 scope

- Home page - the code generator tool
- About page - student details and a video walkthrough
- Tabs page - fully functional tab-widget generator (headers + content -> HTML/JS/CSS output)
- Escape Room, Coding Races, Court Room - placeholder pages (to be completed in a later stage)
- Global layout: header with hamburger/kebab menu, dark/light mode toggle, footer
  with copyright/name/student number/date, and a cookie that remembers the last
  active tab
- Accessibility-compliant markup throughout

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
