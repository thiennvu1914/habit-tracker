# Thiên Vũ - Personal Habit System

![Dashboard Overview](assets/image1.png)

Thiên Vũ is a local-first habit tracking web app built to help you plan, log, and review your routines without needing an account or external database. All data is stored in the browser through `localStorage`, so the app stays private, fast, and easy to run anywhere.

![Today's Tasks & Energy](assets/image2.png)

## Overview

This project is designed around a simple goal: habit tracking should feel clear, lightweight, and dependable. The UI centers on a monthly habit grid, a focused Today view, and analytics that make it easy to understand consistency and progress over time.

The app is fully usable offline after it loads and is structured to work locally during development or as a production build without external services.

## Key Features

![Habit Tracker Grid](assets/image3.png)

- Monthly tracking for up to 20 habits per month.
- Flexible schedules for each habit, including every day, selected weekdays, custom frequencies, and specific dates.
- A focused Today view that only shows tasks that are due and weekly goals that still need completion.
- Rest day handling and rescheduling within the same week without breaking streak logic.
- Non-destructive schedule updates, so changes from today onward preserve historical records.
- Full habit management with add, edit, delete, and month navigation flows.
- Analytics views for daily progress, per-habit breakdowns, and ranking.
- Progress calculations based on scheduled occurrences rather than raw calendar days.
- Weekly streak evaluation for fairer habit tracking.
- Daily energy tracking from 1 to 5.
- CSV export for monthly data.
- Responsive layout for both desktop and mobile use.
- Automatic persistence in the browser with no sign-in required.

![Analytics & Ranking](assets/image4.png)

## Tech Stack

- Next.js and React for the application layer.
- TypeScript for type-safe development.
- Vite and Cloudflare tooling for local development and build flows.
- Drizzle for database-related scaffolding and example integrations.
- LocalStorage as the default persistence layer for the app itself.

## Running Locally

**Prerequisite:** Node.js 22.13 or higher.

```bash
npm install
npm run dev
```

Open the URL shown in your terminal, usually `http://localhost:5173`.

If you are on Windows, you can also double-click `run-local.bat`. On the first run, it installs dependencies and starts the local development server automatically.

## Production Build

To build and test the production version locally:

```bash
npm run build
npm run start
```

## Available Scripts

- `npm run dev` - Start the local development server.
- `npm run build` - Create a production build.
- `npm run start` - Run the production build locally.
- `npm run test` - Build the app and run the rendered HTML test.
- `npm run lint` - Run lint checks.
- `npm run db:generate` - Generate Drizzle artifacts through the project environment setup.

## Screenshots

The images used in this README are stored in the repository under `assets/`, so they render correctly on GitHub after push:

- [assets/image1.png](assets/image1.png)
- [assets/image2.png](assets/image2.png)
- [assets/image3.png](assets/image3.png)
- [assets/image4.png](assets/image4.png)

## Notes

- The app is intentionally local-first and does not require a user account.
- Data stays in the browser unless you explicitly add your own persistence layer.
- If you move the screenshots, update the relative paths in this README so GitHub can still display them.