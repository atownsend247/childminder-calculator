# Childcare calculator: Doing the top-up maths for sleep-deprived parents - Part 6

*~4 min read*

If you've ever tried to work out a payment while running on three hours of broken
sleep, you'll know the feeling: you read the same number four times, and it still
doesn't mean anything. Baby brain is real, and it doesn't only affect the person who
gave birth. Sleep-deprived parents get things wrong in new and creative ways, and
"how much do I need to pay into the childcare account?" is a surprisingly easy one
to get wrong.

## The problem

With Tax-Free Childcare, you don't pay the full bill into the account. You deposit
money and the government tops it up by 20% of what you put in. Put in £100 and the
government adds £20, so there's £120 in the account.

The calculator already told you the monthly total, say £600. The natural, tired,
wrong thought is: the government adds 20%, so I need to pay in 80% of that. Or
perhaps: 20% of £600 is £120, so I need £480. It sounds right. It isn't.

The top-up is 20% of **your deposit**, not 20% of the total. The total is 120% of
what you pay in. So for a £600 bill:

- Wrong: £600 − 20% of £600 = £480 deposited. The account then holds £480 + £96 = £576, which is £24 short.
- Right: £600 ÷ 1.2 = £500 deposited, plus £100 from the government, which is £600.

A £24 shortfall is exactly the kind of mistake that turns up weeks later as a
payment that bounced, or a childminder politely asking about an invoice, at the
point you have the least spare attention for it.

## The fix

Under the "Total to pay" figure, the calculator now shows two more lines:

- **You deposit**: the amount to put into the account.
- **Government top-up (20%)**: what the government will add on top.

The total stays exactly as it was. The new lines just answer the question you
actually have when you open the page.

The maths is two lines:

```js
// Government adds 20% of the deposit, so deposit = total / 1.2
const deposit = grand / 1.2;
document.getElementById('topupDeposit').textContent = fmtMoney(deposit);
document.getElementById('topupGov').textContent = fmtMoney(grand - deposit);
```

The top-up is calculated as `grand - deposit` rather than `deposit * 0.2`, so the
two figures are always derived from the same total. Both are rounded for display, so
a deposit of £500.00 and a top-up of £100.00 will always add back up to the total
shown above them.

## Why it belongs in the calculator

None of this is difficult. Dividing by 1.2 is hardly a feature. But the point of
this tool has always been to remove arithmetic from a monthly chore, and this is
the one piece of arithmetic that people tend to do in their head, at the wrong time
of day, with the wrong formula. A tool that gets the total right and then leaves
you to work out the deposit has only done half the job.

## What I'd do next

- **Make the rate configurable.** 20% is the current top-up rate. If it changes,
  it's currently one number in one place, but it's still hardcoded.
- **Round the deposit up to the penny.** The deposit is currently rounded to the
  nearest penny, which can leave the account a penny short in rare cases.

---

Previous: [← Term dates, persistence, and small decisions](05-term-dates-and-persistence.md)
