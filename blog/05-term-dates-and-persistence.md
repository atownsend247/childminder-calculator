# Childcare calculator: Term dates, persistence, and small decisions - Part 5

*~8 min read*

The last stretch of work was less about the core maths and more about making the
tool something you'd actually keep using: handling term-time-only funding,
remembering your setup, and a handful of small decisions that were easy to get
subtly wrong.

## Term-time-only funding

Some funded hours only apply during school term. In the holidays you still
book the childminder and still pay, but nothing is free. The calculator needed
a way to say "these days are eligible, these aren't".

I chose to let the user enter their **own term date ranges** instead of
hardcoding term dates. Term dates differ by council, school and year, and any
list I shipped would be wrong for someone. It's the same trade as the bank
holidays, except here the data belongs to the user, so it lives in state:

```js
// term dates: { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }[]; days outside all ranges
// are still booked & charged in full, just not eligible for free hours
let termRanges = [];
function isInTerm(iso) { return termRanges.some(r => iso >= r.start && iso <= r.end); }
```

Comparing ISO date strings with `>=` works because `YYYY-MM-DD` sorts
lexicographically in date order. No `Date` objects, no timezone surprises.

An out-of-term day is **removed from the free-hours pool entirely**, not given a
reduced allowance. It's still booked and still charged in full, and it doesn't
count towards the week's hours when working out how many free hours to hand out.
Otherwise a week with two term days and three holiday days would still try to
spend a full week's allowance across all five.

## Two guards against surprising the user

**The toggle does nothing until there's a range.** With term-time-only turned on
and no ranges entered, every day is technically out of term, which would silently
zero out all free hours the moment someone ticked the box. So the calculation only
restricts when at least one range exists:

```js
const termTimeOnly = termTimeOnlyEl.checked && termRanges.length > 0;
```

The empty state says so on screen too: "No term dates added yet — free hours
won't apply anywhere until you add at least one range."

**Term dates aren't applied outside the selected month.** Part 4 filled in the
adjacent-month days of a partial week using the normal schedule. For those
days, the code deliberately doesn't check term dates, and says why:

```js
// term dates are deliberately NOT checked here: a term range the user entered
// for this month may simply not yet extend into the adjacent month, and that
// shouldn't be read as "this day is a school holiday"
```

If you've entered September's term and look at September, the Monday and Tuesday
from late August aren't covered by any range. Treating them as holidays would
quietly cut the first week's funded hours. Bank holidays and tapped exclusions
are real facts about a date; absence from a list the user has partly filled in
isn't. It's the kind of decision that doesn't show up in a feature list but
decides whether the numbers can be trusted.

## Remembering the setup

Entering two childminders, five days of hours, rates, a free-hours figure and a
set of term dates every visit is a lot of friction for a monthly tool. The fix is
`localStorage`, with no server involved, so the privacy story from
[Part 1](01-why-a-static-page.md) is unchanged.

The decision I'm happiest with is what *not* to save. The selected month and any
tapped exclusions are deliberately left out:

```js
// ... The selected month and any tapped calendar exclusions are
// deliberately NOT persisted, so you always land on the current month with a clean slate.
```

Setup is stable across months, but "I ticked the 12th as a sick day" is true
for one month in one session. Saving it would make next month's total
mysteriously wrong. Opening the page should show the current month with your
usual setup.

There are two other details. Storage can fail, since private browsing, disabled
storage and full quotas all throw, so both directions are wrapped in
`try`/`catch` and fail silently into the defaults:

```js
try {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ childminders, schedule, termRanges, /* ... */ }));
} catch (e) {
  // private browsing / storage disabled / quota exceeded -- just don't persist
}
```

And loading doesn't trust what it finds. Each field is checked before it's
used: the childminder count must be 1 to 4, the schedule must have exactly five
entries, term ranges must have string `start` and `end`. Anything that doesn't
fit is ignored and the default stays. The key is versioned
(`childcare-calculator-state-v1`), so if the shape of the state changes one day,
old data can be recognised or discarded rather than misread.

Saving is hooked in once, not per handler: `calculate()` runs after every
change, so it calls `saveState()` at the end, and no individual handler has to
remember to persist. On startup, `loadState()` runs before the first
`refreshAll()`, so the page renders from the restored setup.

## Small things

- **Bank holidays can be turned off.** Some providers charge on bank holidays,
  so there's a toggle, on by default, that treats them as normal booked days.
  The note under the calendar changes to say whether they were excluded or still
  charged.
- **Tap a day to exclude it.** The calendar cell is the control, not a separate
  form. Tapping again brings it back. This was the original reason for not using
  a spreadsheet.
- **A donation link.** A Buy Me a Coffee badge in the README. A free tool that
  saves a few people some arithmetic every month can afford a small ask.

## What I'd do next

- **Move bank holidays out of `app.js`.** They run out at the end of 2027, and
  extending a hardcoded set is a chore someone will forget.
- **Make `calculate()` pure.** It currently reads the DOM, does the maths and
  writes the DOM. Splitting it into "compute a result" and "render a result"
  would let me test the partial-week cases properly.
- **Scotland and Northern Ireland.** The holiday list is England and Wales only.
- **Handle more than five days.** Weekend and evening care is ignored entirely.

The project is a good argument for starting small. Three files, no
dependencies, and every feature in this series was a function and a bit of DOM.
The hard parts were never the framework. They were what a "week" means at the
edge of a month, and who gets the free hours.

---

<!-- commits: 77d78b9 fcd5c45 989f169 -->

Previous: [← Spreading hours across the week](04-weeks-and-partial-weeks.md)
