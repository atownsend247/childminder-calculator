# Childcare Hours Calculator

[![Deploy to GitHub Pages](https://github.com/atownsend247/childminder-calculator/actions/workflows/deploy.yml/badge.svg)](https://github.com/atownsend247/childminder-calculator/actions/workflows/deploy.yml)
[![Buy Me A Coffee](https://img.shields.io/badge/-buy%20me%20a%20coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/atownsend247)

**[Open the live calculator](https://atownsend247.github.io/childminder-calculator/)**

A single-page tool for working out your monthly childcare cost across **one to four
childminders**, after government-funded free hours and bank holidays.

No build step, no dependencies, no framework — just three static files
(`index.html`, `styles.css`, `app.js`). Everything runs in the browser and nothing
is sent anywhere; there is no backend.

## Features

- **1–4 childminders**, each with an independent name and hourly rate. Add or remove
  them with the buttons on the Childminders card.
- **Weekly schedule** (Mon–Fri): assign each day to a childminder and set the hours.
  The pattern repeats across every week of the selected month.
- **Free hours** capped per week, split across the childminders by a strategy you choose:
  - Prioritise the more expensive childminder (usually the cheapest overall — a free hour
    is worth more against a higher rate)
  - Prioritise the cheaper childminder
  - Split proportionally to the hours booked with each that week
  - Custom split — a relative weight slider per childminder (weights don't need to
    total 100%; no childminder is allocated more free hours than they were booked for,
    and any remainder passes to the others)
- **Bank holidays** (England & Wales) auto-excluded — no childcare, no charge.
  A toggle (on by default) lets you turn this off so bank holidays are treated as
  normal booked days.
- **Calendar view** of the month: per-day childminder, hours, cost, and a marker
  when free hours were applied. Tap any scheduled day to exclude it (sick day, day off)
  and tap again to include it.
- **Weekly breakdown**: funded hours and cost for each week of the month (Week 1,
  Week 2, ... including a Week 5 when the month spans one), shown after the calendar.
- **Monthly breakdown**: total hours, free hours used, paid hours, and cost per
  childminder, plus a grand total.

## Usage

Open `index.html` in a browser. Then:

1. Pick the **month** and your **free hours per week**.
2. Choose how free hours should be **split** each week.
3. Add the **childminders** you use and set each one's **name** and **rate**.
4. Fill in the **weekly schedule**.
5. Read the **calendar**, **weekly breakdown**, and **monthly breakdown**. Tap
   calendar days to exclude one-offs.

All figures update live as you type.

## How the calculation works

- Each weekday in the month is matched to the weekly schedule by day of week.
- Weekends are always skipped. Bank holidays are skipped while the toggle is on.
- Days are grouped into weeks keyed by their Monday. Free hours for a week are
  `min(free hours per week, hours actually booked that week)`, then split across the
  childminders using the chosen strategy.
- Each childminder's weekly free allocation is then spread as evenly as possible
  across their booked days that week (capped at each day's booked hours), so the
  calendar can show a day-by-day cost rather than front-loading free hours onto the
  earliest days.
- Cost per childminder = paid hours × their rate. Grand total = sum across all
  childminders.

### Known limitation

Weeks that straddle the start or end of the month are counted using only the days
that fall inside the selected month. If you also use free hours elsewhere in such a
week (i.e. in the adjacent month), you may need to adjust manually.

## Maintaining the bank holiday list

Bank holidays are hardcoded in `app.js` as `BANK_HOLIDAYS`, currently covering
**2025–2027** (England & Wales). To extend or correct them, edit that `Set` of
`YYYY-MM-DD` strings. Official dates: <https://www.gov.uk/bank-holidays>.

## Running locally

Opening the file directly works. To match a hosted setup, serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying

It's a static site — copy the three files (keeping them together) to any static host:

- **GitHub Pages** — this repo deploys automatically via
  [.github/workflows/deploy.yml](.github/workflows/deploy.yml) on every push to
  `main` (set the repo's Settings → Pages → Source to **GitHub Actions** once).
  The live site: <https://atownsend247.github.io/childminder-calculator/>
- **Netlify / Vercel / Cloudflare Pages** — drag-drop the folder or connect the repo.
- **Any web server or object store** — drop the files in the web root; `index.html`
  is served by default.

## Project structure

```
childcare-calculator/
├── index.html   markup
├── styles.css   all styling, incl. the 4-slot childminder colour palette
├── app.js       state, childminder add/remove, calculation, calendar rendering
├── .github/workflows/deploy.yml   builds & deploys to GitHub Pages on push to main
└── README.md
```
