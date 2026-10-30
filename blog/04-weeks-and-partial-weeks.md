# Childcare calculator: Spreading hours across the week, and the partial-week problem - Part 4

*~9 min read*

[Splitting free hours](03-splitting-free-hours.md) gives each childminder a
weekly allocation. This post is about turning that into the day-by-day numbers
on the calendar, adding a weekly breakdown, and fixing the most interesting bug
in the project: a month rarely starts on a Monday.

## Free hours are weekly, the calendar is daily

The first version applied each week's free hours **chronologically**: Monday's
hours were free until the allowance ran out, then the rest were paid. The totals
were right, but the calendar looked odd. With 21.5 free hours spread over four
8.5-hour days, you'd see Monday and Tuesday fully free, Wednesday partly free
and Thursday fully paid.

That's arithmetically fine and useless for a sanity check. You can't glance at
the calendar and tell whether the figures look right. I changed it to spread
free hours as evenly as possible across the days, in half-hour units, and the
same example now reads 5, 5.5, 5.5, 5.5.

## `spreadEven`

The function takes a total and a cap for each day, and works in two passes.

First, a water-filling loop: give every open day an equal share, and if a day
hits its cap, close it and share what's left among the rest. That handles days
with different lengths.

Second, rounding. Real childminders bill in sensible units, and 5.375 hours
on a calendar cell is noise, so shares are rounded **down** to half-hour units.
Rounding down loses a little, so the leftover units get handed back one at a
time:

```js
// hand out the leftover half-hour units one at a time, round-robin from the last
// day backwards, so no single day soaks up the whole remainder
let leftoverUnits = Math.round((total - roundedSum) / unit);
let i = count - 1;
let attempts = 0;
while (leftoverUnits > 0 && attempts < count * 1000) {
  if (share[i] + unit <= capArr[i] + 1e-9) {
    share[i] += unit;
    leftoverUnits--;
  }
  i = (i - 1 + count) % count;
  attempts++;
}
```

Working through 21.5 over four 8.5-hour days: an equal share is 5.375, which
rounds down to 5 each, totalling 20. That leaves 1.5 hours, or three units,
which go to Thursday, Wednesday and Tuesday in that order. Result:
`[5, 5.5, 5.5, 5.5]`, which sums to 21.5.

Why start from the *last* day? It's a small judgement call: if one day has to be
a half-hour lighter, I'd rather it was Monday than Friday, and it gives a
stable result. The `attempts` guard is the same belt-and-braces idea as before:
the loop cannot run forever even if the caps leave no room.

## A weekly breakdown

While I was in there, the page gained a **weekly breakdown** (funded hours, and
shortly after, unfunded hours and cost for each week), shown after the calendar.
Weeks are grouped by their Monday, so a month that spans five calendar weeks
shows five, labelled "Week 1" to "Week 5" with the date range each covers, like
"15–19 Sep".

The unfunded-hours row came in a follow-up commit because I realised the
breakdown showed what you *didn't* pay for and left you to subtract to see what
you did. One more row, three more lines of code.

## The partial-week bug

Here's the case that broke the model. Suppose a month starts on a Wednesday.
The first calendar week in that month has only Wednesday to Friday: three days.

The calculation grouped booked days by week and gave each week
`min(free hours per week, hours booked that week)` free hours. With three
8.5-hour days that's 25.5 booked hours, which is under a 30-hour allowance.
**The entire first week came out free.**

But it isn't really a three-day week. It's a *standard* week where Monday and
Tuesday happen to belong to last month. The funded entitlement is weekly, so
for the other half of that week the child was in care and the free hours were
being used up on Monday and Tuesday in the *previous* month's calculation. The
month-boundary week was getting a whole fresh allowance for a fraction of the
days. My commit message put it as "3 days is 30 hours": the tool was treating
a three-day stub as if it earned the full 30.

## The fix: fill in the rest of the week

The correct model is that a week is a week, no matter which month's page you're
looking at. So for each week touched by the month, the calculation builds the
**full Monday-to-Friday list**, using the real day records for days inside the
month and the normal weekly schedule for days outside it:

```js
for (let offset = 0; offset < 5; offset++) {
  const d = new Date(monday);
  d.setDate(monday.getDate() + offset);
  if (d.getFullYear() === year && d.getMonth() === monthIndex) {
    // a real day in this month
    ...
  } else {
    // a day in the adjacent month: use the normal scheduled day
    const entry = schedule[offset];
    const dIso = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
    const skip = (excludeHolidays && BANK_HOLIDAYS.has(dIso)) || excludedDates.has(dIso);
    if (entry && entry.cm >= 0 && entry.cm < n && entry.hours > 0 && !skip) {
      fullDays.push({ cm: entry.cm, hours: entry.hours, rec: null });
    }
  }
}
```

Those full-week days feed `splitFree` and `spreadEven`, so the weekly allocation
is worked out on the whole week. Then only the days that are actually in the
selected month get shown and charged: records for adjacent-month days have
`rec: null` and are skipped when results are written back.

The adjacent month's own page works out its days independently, with the same
full-week logic, so a week split across two months ends up with one allowance
shared between them rather than doubled.

Bank holidays and tapped exclusions still apply to the out-of-month days,
since those are real. Term dates are a different story, and that's a design
decision worth its own post.

## Testing this without a test suite

There's no test framework, and the cases that matter are the boundaries:
months starting on each weekday, months ending mid-week, and months where the
first or last week contains a bank holiday. The month picker makes those quick
to eyeball by flipping through months and watching the weekly breakdown, but
that's manual. If this grows, a
`calculate()` that returns data instead of writing to the DOM would be the first
refactor, since it would make these cases testable.

---

<!-- commits: d8442a9 5b4ec78 ae13bbf 77d78b9 -->

Previous: [← Splitting free hours](03-splitting-free-hours.md) · Next: [Term dates, persistence, and small decisions →](05-term-dates-and-persistence.md)
