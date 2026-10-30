# Childcare calculator: Splitting free hours across childminders - Part 3

*~8 min read*

The part of this calculator that actually needed thinking about is free hours.
A funded entitlement is a number of hours per week, and it isn't tied to a
particular childminder. If you use two childminders at different rates, you
choose where those free hours land, and the choice changes the monthly bill
quite a lot. This post is about the four strategies and the one rule that
keeps them honest.

## Why it matters

Take the default setup in the app: Childminder A at £5.50/hr for four days of
8.5 hours (34 hours), Childminder B at £7.50/hr for one day of 8.5 hours.
That's 42.5 booked hours in a week. Say 30 are funded. The same 30 free hours
produce three different weekly bills:

| Strategy | A free / paid | B free / paid | Weekly cost |
|---|---|---|---|
| Expensive first | 21.5 / 12.5 | 8.5 / 0 | £68.75 |
| Proportional | 24 / 10 | 6 / 2.5 | £73.75 |
| Cheaper first | 30 / 4 | 0 / 8.5 | £85.75 |

A free hour is worth whatever the rate is, so spending free hours on the
expensive childminder first saves the most. The gap between the best and worst
here is £17 a week, which is over £70 a month. That's why the strategy is a
dropdown and not something the code decides for you.

(Whether your childcare provider lets you split funding this way is a separate
question that depends on your arrangement and local authority. The calculator
just does the arithmetic for whichever rule you choose.)

## The four strategies

All four live in one function, `splitFree(weekHours, freeForWeek)`, which takes
the hours booked with each childminder this week and the total free hours to
hand out, and returns an array of allocations.

**Proportional** is the simplest: each childminder gets a share of the free
hours matching their share of the booked hours.

```js
if (strategy === 'proportional') {
  for (let i = 0; i < n; i++) alloc[i] = freeForWeek * (weekHours[i] / weekTotal);
  return alloc;
}
```

**Expensive first** and **cheaper first** share a branch. Sort the childminders
by rate, then fill each one up to their booked hours before moving to the next:

```js
const order = childminders.map((_, i) => i).sort((a, b) =>
  strategy === 'expensive-first' ? rates[b] - rates[a] : rates[a] - rates[b]);
let remaining = freeForWeek;
for (const i of order) {
  const take = Math.min(remaining, weekHours[i]);
  alloc[i] = take;
  remaining -= take;
  if (remaining <= 0) break;
}
```

The `Math.min(remaining, weekHours[i])` is the important part, and it's the rule
mentioned above: **nobody is allocated more free hours than they were booked
for.** You can't use 30 free hours at a childminder you only see for 8.5.

## Custom split, and the leftover problem

The fourth strategy, **custom**, came in with multiple childminders. Each one gets
a slider, and the sliders are *relative weights*: 50/50, 70/30 and 7/3 mean the
same thing, and they don't need to add up to 100.

The catch is the cap. Suppose the weights say "split evenly" but one
childminder is booked for 6 hours and the other for 36, with 30 hours to give.
An even split would hand 15 to someone who only works 6. The surplus has
nowhere to go, so it needs to pass to whoever still has room.

The implementation loops. On each pass it shares what's left among the
childminders who still have unfunded booked hours, in proportion to their
weights, clamped to their remaining capacity. Whatever couldn't be placed goes
round again:

```js
let remaining = freeForWeek;
let guard = 0;
while (remaining > 1e-9 && guard++ < 25) {
  const elig = [];
  let eligW = 0;
  for (let i = 0; i < n; i++) {
    if (alloc[i] < weekHours[i] - 1e-9) { elig.push(i); eligW += pcts[i]; }
  }
  if (!elig.length) break;
  let used = 0;
  for (const i of elig) {
    const want = (eligW > 0) ? remaining * (pcts[i] / eligW) : remaining / elig.length;
    const take = Math.min(want, weekHours[i] - alloc[i]);
    alloc[i] += take;
    used += take;
  }
  remaining -= used;
  if (used <= 1e-9) break;
}
```

Two defensive details in there are worth calling out. The `1e-9` tolerance
avoids floating-point dust (a childminder who's "full" by 0.0000000001 still
counting as eligible). The `guard` counter and the `used <= 1e-9` break are a
belt-and-braces way of making sure a bad input can never turn into an infinite
loop in someone's browser tab. If every weight is zero, the `eligW > 0` check
falls back to an even split between the eligible childminders rather than
dividing by zero.

## A preview, so sliders aren't blind

Dragging a weight slider and seeing nothing change would be a poor experience,
because the real effect only shows up in the monthly breakdown further down
the page. So the custom-split card shows the result of the split on a
**standard week**, computed from the weekly schedule alone, ignoring holidays,
exclusions and the actual month:

```js
const standardWeekHours = new Array(n).fill(0);
schedule.forEach(entry => {
  if (entry.cm != null && entry.cm >= 0 && entry.cm < n && entry.hours > 0) {
    standardWeekHours[entry.cm] += entry.hours;
  }
});
const standardFreeForWeek = Math.min(freeHoursPerWeek, standardWeekTotal);
const standardAlloc = splitFree(standardWeekHours, standardFreeForWeek);
```

It reuses `splitFree`, so the preview and the real calculation can't drift
apart. That's a pattern I kept coming back to: when two parts of the UI need to
agree, make them call the same function.

## Next

`splitFree` answers "how many free hours does each childminder get this week?".
It says nothing about *which days* those hours fall on, and that turned out to
matter for the calendar.
[The next post](04-weeks-and-partial-weeks.md) covers that, and a bug about weeks
that start or end mid-month.

---

<!-- commits: 700e03a d21725b -->

Previous: [← From two childminders to four](02-from-two-childminders-to-four.md) · Next: [Spreading hours across the week →](04-weeks-and-partial-weeks.md)
