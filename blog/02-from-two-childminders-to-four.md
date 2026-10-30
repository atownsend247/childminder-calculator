# Childcare calculator: From two childminders to four - Part 2

*~7 min read*

[Last time](01-why-a-static-page.md) the calculator had exactly two
childminders, written into the markup as "A" and "B". That matched my own
situation, but it's a poor assumption for a tool other people might use. This
post covers the commit that replaced it with one to four childminders, and
what that did to the code.

## The assumption was everywhere

Two childminders sounds like a small thing to hardcode. In the first version
it showed up in:

- the markup, as two pairs of name and rate inputs
- the schedule dropdowns, as options with values `'A'` and `'B'`
- the weekly totals, as `{ A: hours, B: hours }`
- the cost calculation and the summary cards
- the colours

Making the number variable meant touching all of it. The commit was +358/-223
lines, which is a lot for what looks like "add an Add button".

## One array as the source of truth

The core change was moving from named fields to an array:

```js
// each childminder: { name, rate, pct }  (pct = relative weight for the custom split)
let childminders = [
  { name: 'Childminder A', rate: 5.50, pct: 50 },
  { name: 'Childminder B', rate: 7.50, pct: 50 }
];

// schedule[0..4] = Mon..Fri, { cm: <childminder index> | -1 for none, hours: <number> }
```

A schedule entry's `cm` changed from the string `'A'` to an **index** into that
array, with `-1` meaning "nobody that day". Weekly hours went from
`{ A, B }` to a numeric array with one slot per childminder, and every loop
over "both childminders" became a loop over `n`.

An index is simple, but it has a catch.

## Removing someone shifts everyone after them

If three childminders exist and you remove the first, the old second is now
index 0. Any schedule day pointing at index 1 would suddenly point at the wrong
person, or at nobody. So removal has to repoint the schedule:

```js
function removeChildminder(idx) {
  if (childminders.length <= MIN_CM) return;
  childminders.splice(idx, 1);
  // repoint the weekly schedule: dropped -> none, later indices shift down one
  schedule.forEach(entry => {
    if (entry.cm === idx) entry.cm = -1;
    else if (entry.cm > idx) entry.cm -= 1;
  });
  refreshAll();
}
```

Days that belonged to the removed childminder become unscheduled, and days
that belonged to anyone later get decremented. It's four lines, and it's the
bug I'd most expect to ship with a naive "just splice the array" version.

Using stable IDs instead of indices would avoid the shifting. I didn't, because
the list is capped at four and the repointing is easy to read and test by
hand. For a bigger list I'd switch.

## Rebuild the DOM from state

With a variable number of cards, hand-written HTML stops working. The page now
rebuilds the childminder cards, the schedule dropdowns, the custom-split sliders
and the legend from the arrays, through a set of `render*` functions that
`refreshAll()` calls in turn.

That created a problem with typing. If every keystroke in a name field rebuilt
the cards, the input would lose focus after each character. The fix is a
comment in the code and a deliberate split in the event handler:

```js
if (e.target.classList.contains('cmName')) {
  childminders[idx].name = e.target.value;
  // the name shows in several places; refresh those but NOT the cards (would drop focus)
  renderSchedule();
  renderManualRows();
  renderLegend();
  calculate();
}
```

The name appears in the schedule dropdowns, the sliders and the legend, so
those get re-rendered. The card holding the input being typed in does not.
Rate changes only need `calculate()`, since a rate appears nowhere but the
maths.

Events are also **delegated** onto the container elements (`cmListEl`,
`schedBodyEl`, `manualRowsEl`). The containers survive re-renders and their
children don't, so listeners attached to the children would be thrown away
every time.

## Colours

Each childminder needs a colour that carries through the calendar, the legend
and the summary cards. `styles.css` defines a four-slot palette
(`cm-c0` to `cm-c3`), and `cmClass(i)` maps an index to a class:

```js
const MAX_CM = 4;         // colours cm-c0..cm-c3 are defined in styles.css
const PALETTE_SIZE = 4;
function cmClass(i) { return 'cm-c' + (i % PALETTE_SIZE); }
```

The cap of four is really a palette limit. A fifth childminder would need a
fifth distinguishable colour, and four was already enough for any realistic
case. Having one constant refer to the other in a comment keeps the next
person from raising the limit without adding a colour.

## What got easier

Not much got easier for the user, but one thing did for me: once the
childminders were data, adding a feature that applies to all of them stopped
needing special cases. That mattered a lot for the next problem, which is that
free hours are shared between the childminders, and *how* they're shared changes
the bill. [That's next.](03-splitting-free-hours.md)

---

<!-- commits: d21725b -->

Previous: [← Why a static page](01-why-a-static-page.md) · Next: [Splitting free hours →](03-splitting-free-hours.md)
