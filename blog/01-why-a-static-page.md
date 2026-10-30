# Childcare calculator: Why a static page, and why not a spreadsheet - Part 1

*~6 min read*

Childcare costs are one of those bills that look simple until you try to predict
them. A childminder charges an hourly rate. You book some days. The government
funds some of the hours. Bank holidays don't count. And somehow the number on the
invoice is never the number you guessed.

I wanted a way to type in my setup and see the month's cost, day by day, before
the invoice arrived. This post is about the first decision: what to build it
with, and what the first version actually did.

## Why not a spreadsheet?

A spreadsheet was the obvious first answer, and It's what most people reach for. It
stops working well when you want to do three things:

- **Show a calendar.** A grid of days with the childminder, hours and cost on each
  one is the natural way to sanity-check a month. Spreadsheets can fake it, badly.
- **Tap a day to remove it.** Sick days and days off are the main reason a real
  invoice differs from the plan. I wanted to click a day and watch the total change.
- **Hand it to someone else.** A link anyone can open on a phone beats "here's my
  spreadsheet, don't touch the formulas".

None of that is hard in a web page, and all of it is awkward in a spreadsheet.

## Three files and no build step

The whole project is `index.html`, `styles.css` and `app.js`. No framework, no
bundler, no `package.json`, no backend. I'm a fan of this for a tool this size,
and there's a privacy argument too: the inputs are rates and a weekly schedule
for your child, and I'd rather that never left the browser. With no server there's
nothing to leak and nothing to keep running.

The cost of that choice is that the state has to live somewhere, and the DOM
makes a poor place for it. Even the first version kept the data separate from
the markup:

```js
const excludedDates = new Set(); // ISO date strings the user has tapped to exclude

const defaultSchedule = [
  { cm: 'A', hours: 8.5 },
  { cm: 'A', hours: 8.5 },
  { cm: 'A', hours: 8.5 },
  { cm: 'A', hours: 8.5 },
  { cm: 'B', hours: 8.5 }
];
```

A schedule is five entries (Monday to Friday), each with a childminder and a
number of hours. Excluded days are a set of ISO date strings. Everything on the
page is derived from those two things plus a few inputs, and `calculate()`
re-derives the lot on every change. For a page this small, recomputing
everything on every keystroke is cheap and means there's no "update the right
bit" logic to get wrong.

## The first version's model

The initial commit already had the shape the calculator still has:

1. Walk every day of the selected month.
2. Skip weekends. Skip bank holidays if the toggle is on.
3. Look up that weekday in the weekly schedule.
4. Group the surviving days into weeks, keyed by the Monday of that week.
5. Apply the free-hours allowance per week, then price what's left.

Bank holidays are a hardcoded set of `YYYY-MM-DD` strings for England and Wales:

```js
const BANK_HOLIDAYS = new Set([
  '2025-01-01','2025-04-18','2025-04-21', /* ... */
  '2027-12-27','2027-12-28'
]);
```

That's a deliberate shortcut. There's no API call and no dependency, and the
cost is that someone has to extend the list by hand every couple of years. The
README says so, with a link to the official dates. I'd rather have an honest
manual step than a network request that can fail.

## Publishing it

A tool nobody can open is a tool nobody uses, so the next few commits were about
reach rather than features: a GitHub Actions workflow that deploys to GitHub
Pages on every push to `main`, a status badge, a link to the live site in the
README, and and a fix for dropdown styling. Because
there's no build step, the workflow is just "upload the folder".

That's the whole appeal of the approach. Pushing a commit is deploying, and
the deployed thing is exactly the files in the repo.

## What this version couldn't do

It had two childminders hardcoded as "A" and "B", with the names and rates as
two fixed pairs of inputs. That's fine until you have one childminder, or
three. [The next post](02-from-two-childminders-to-four.md) is about removing
that assumption, which touched almost every function in the file.

---

<!-- commits: 700e03a 41f3a02 ca2c0c8 20f87d6 9948018 -->

Next: [From two childminders to four →](02-from-two-childminders-to-four.md)
