// England & Wales bank holidays (extend this list for future years as needed)
const BANK_HOLIDAYS = new Set([
  '2025-01-01','2025-04-18','2025-04-21','2025-05-05','2025-05-26','2025-08-25','2025-12-25','2025-12-26',
  '2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-28',
  '2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28'
]);

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const schedBody = document.getElementById('schedBody');
const excludedDates = new Set(); // ISO date strings the user has tapped to exclude

const defaultSchedule = [
  { cm: 'A', hours: 8.5 },
  { cm: 'A', hours: 8.5 },
  { cm: 'A', hours: 8.5 },
  { cm: 'A', hours: 8.5 },
  { cm: 'B', hours: 8.5 }
];

DAY_NAMES.forEach((day, i) => {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="day-label">${day}</td>
    <td class="cm-col">
      <select data-day="${i}" class="cmSelect">
        <option value="none">None</option>
        <option value="A">Childminder A</option>
        <option value="B">Childminder B</option>
      </select>
    </td>
    <td class="hrs-col"><input type="number" data-day="${i}" class="hrsInput" min="0" step="0.25" value="${defaultSchedule[i].hours}"></td>
  `;
  schedBody.appendChild(tr);
  tr.querySelector('.cmSelect').value = defaultSchedule[i].cm;
});

function pad(n) { return n.toString().padStart(2, '0'); }
function isoDate(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function fmtHours(n) { return n.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' hrs'; }
function fmtMoney(n) { return '£' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getSchedule() {
  const sched = [];
  document.querySelectorAll('.cmSelect').forEach(sel => {
    const day = parseInt(sel.dataset.day);
    const hrsInput = document.querySelector(`.hrsInput[data-day="${day}"]`);
    sched[day] = { cm: sel.value, hours: parseFloat(hrsInput.value) || 0 };
  });
  return sched;
}

function calculate() {
  const monthVal = document.getElementById('monthPicker').value; // "YYYY-MM"
  if (!monthVal) return;
  const [year, monthNum] = monthVal.split('-').map(Number);
  const monthIndex = monthNum - 1;

  const excludeHolidays = document.getElementById('excludeHolidays').checked;
  const freeHoursPerWeek = parseFloat(document.getElementById('freeHours').value) || 0;
  const nameA = document.getElementById('nameA').value || 'Childminder A';
  const nameB = document.getElementById('nameB').value || 'Childminder B';
  const rateA = parseFloat(document.getElementById('rateA').value) || 0;
  const rateB = parseFloat(document.getElementById('rateB').value) || 0;
  const schedule = getSchedule();

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weeks = {}; // key: monday ISO date -> { A: hours, B: hours, days: [] }
  const holidaysHit = [];
  const dayRecords = []; // one entry per calendar day in the month

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dow = dateObj.getDay(); // 0=Sun..6=Sat
    const iso = isoDate(year, monthIndex, d);
    const isWeekend = (dow === 0 || dow === 6);
    const isHoliday = BANK_HOLIDAYS.has(iso);

    const rec = { date: d, iso, dow, isWeekend, isHoliday, cm: 'none', hours: 0, free: 0, paid: 0, cost: 0, clickable: false, excluded: false };

    if (isWeekend) {
      dayRecords.push(rec);
      continue;
    }
    if (isHoliday) {
      holidaysHit.push(iso);
      if (excludeHolidays) {
        dayRecords.push(rec);
        continue;
      }
      // otherwise fall through and treat as a normal booked weekday
    }

    const dayIdx = dow - 1; // 0=Mon..4=Fri
    const entry = schedule[dayIdx];
    if (!entry || entry.cm === 'none' || entry.hours <= 0) {
      dayRecords.push(rec);
      continue;
    }

    rec.clickable = true;
    rec.cm = entry.cm; // keep set for styling even if the day is excluded

    if (excludedDates.has(iso)) {
      rec.excluded = true;
      dayRecords.push(rec);
      continue; // hours stay 0 — excluded from all totals
    }

    rec.hours = entry.hours;

    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() - (dow - 1));
    const weekKey = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    rec.weekKey = weekKey;

    if (!weeks[weekKey]) weeks[weekKey] = { A: 0, B: 0, days: [] };
    weeks[weekKey][entry.cm] += entry.hours;
    weeks[weekKey].days.push(rec);
    dayRecords.push(rec);
  }

  const allocStrategy = document.getElementById('allocStrategy').value;
  const manualPctA = parseFloat(document.getElementById('manualPct').value) || 0;

  function splitFree(w, freeForWeek) {
    const weekTotal = w.A + w.B;
    if (weekTotal <= 0) return { A: 0, B: 0 };

    if (allocStrategy === 'proportional') {
      const fA = freeForWeek * (w.A / weekTotal);
      return { A: fA, B: freeForWeek - fA };
    }

    if (allocStrategy === 'expensive-first' || allocStrategy === 'cheaper-first') {
      const order = (allocStrategy === 'expensive-first')
        ? (rateA >= rateB ? ['A', 'B'] : ['B', 'A'])
        : (rateA <= rateB ? ['A', 'B'] : ['B', 'A']);
      let remaining = freeForWeek;
      const alloc = { A: 0, B: 0 };
      order.forEach(cm => {
        const take = Math.min(remaining, w[cm]);
        alloc[cm] = take;
        remaining -= take;
      });
      return alloc;
    }

    // manual %
    let fA = Math.min(freeForWeek * (manualPctA / 100), w.A);
    let fB = Math.min(freeForWeek - fA, w.B);
    const leftover = freeForWeek - fA - fB;
    if (leftover > 0) fA = Math.min(fA + leftover, w.A);
    return { A: fA, B: fB };
  }

  let totalA = 0, totalB = 0, freeA = 0, freeB = 0, paidA = 0, paidB = 0;

  Object.values(weeks).forEach(w => {
    const weekTotal = w.A + w.B;
    totalA += w.A;
    totalB += w.B;
    const freeForWeek = Math.min(freeHoursPerWeek, weekTotal);
    const alloc = splitFree(w, freeForWeek);
    freeA += alloc.A;
    freeB += alloc.B;
    paidA += (w.A - alloc.A);
    paidB += (w.B - alloc.B);

    // distribute the free allocation across this week's days, chronologically,
    // per childminder, so the calendar can show a day-by-day breakdown
    const balance = { A: alloc.A, B: alloc.B };
    const rateByCm = { A: rateA, B: rateB };
    w.days
      .slice()
      .sort((a, b) => a.date - b.date)
      .forEach(rec => {
        const take = Math.min(balance[rec.cm], rec.hours);
        rec.free = take;
        rec.paid = rec.hours - take;
        rec.cost = rec.paid * rateByCm[rec.cm];
        balance[rec.cm] -= take;
      });
  });

  const costA = paidA * rateA;
  const costB = paidB * rateB;
  const grand = costA + costB;

  const summaries = document.getElementById('cmSummaries');
  summaries.innerHTML = `
    <div class="cm-summary a">
      <div class="name">${nameA}</div>
      <div class="row"><span class="label">Total hours</span><span class="value">${fmtHours(totalA)}</span></div>
      <div class="row"><span class="label">Free hours used</span><span class="value">${fmtHours(freeA)}</span></div>
      <div class="row paid"><span class="label">Paid hours</span><span class="value">${fmtHours(paidA)}</span></div>
      <div class="row paid"><span class="label">Cost</span><span class="value">${fmtMoney(costA)}</span></div>
    </div>
    <div class="cm-summary b">
      <div class="name">${nameB}</div>
      <div class="row"><span class="label">Total hours</span><span class="value">${fmtHours(totalB)}</span></div>
      <div class="row"><span class="label">Free hours used</span><span class="value">${fmtHours(freeB)}</span></div>
      <div class="row paid"><span class="label">Paid hours</span><span class="value">${fmtHours(paidB)}</span></div>
      <div class="row paid"><span class="label">Cost</span><span class="value">${fmtMoney(costB)}</span></div>
    </div>
  `;

  document.getElementById('grandTotal').textContent = fmtMoney(grand);

  const holidayNote = document.getElementById('holidayNote');
  if (holidaysHit.length > 0) {
    const list = holidaysHit.map(d => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }).join(', ');
    holidayNote.innerHTML = excludeHolidays
      ? `<strong>Bank holidays excluded this month:</strong> ${list}`
      : `<strong>Bank holidays this month (still booked &amp; charged):</strong> ${list}`;
  } else {
    holidayNote.innerHTML = `<strong>No bank holidays</strong> fall in this month.`;
  }

  // ---- render calendar ----
  document.getElementById('legendNameA').textContent = nameA;
  document.getElementById('legendNameB').textContent = nameB;
  document.getElementById('calMonthLabel').textContent =
    new Date(year, monthIndex, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const calGrid = document.getElementById('calGrid');
  calGrid.innerHTML = '';

  const firstDow = new Date(year, monthIndex, 1).getDay(); // 0=Sun..6=Sat
  const leadingBlanks = (firstDow === 0) ? 6 : (firstDow - 1); // Mon-start grid

  for (let i = 0; i < leadingBlanks; i++) {
    const blank = document.createElement('div');
    blank.className = 'cal-cell empty';
    calGrid.appendChild(blank);
  }

  dayRecords.forEach(rec => {
    const cell = document.createElement('div');
    let cls = 'cal-cell';
    let inner = `<div class="cal-date">${rec.date}</div>`;

    if (rec.isWeekend) {
      cls += ' weekend';
    } else if (rec.isHoliday && excludeHolidays) {
      cls += ' holiday';
      inner += `<div class="cal-holiday-label">Holiday</div>`;
    } else if (rec.excluded) {
      cls += ' excluded ' + rec.cm.toLowerCase();
      inner += `<div class="cal-excluded-label">Excluded</div>`;
      if (rec.isHoliday) inner += `<div class="cal-holiday-label">Holiday</div>`;
    } else if (rec.cm === 'none') {
      cls += ' unscheduled';
      if (rec.isHoliday) inner += `<div class="cal-holiday-label">Holiday</div>`;
    } else {
      cls += ' ' + rec.cm.toLowerCase();
      inner += `<div class="cal-hours">${rec.hours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h</div>`;
      inner += `<div class="cal-cost">${fmtMoney(rec.cost)}</div>`;
      if (rec.isHoliday) inner += `<div class="cal-holiday-label">Holiday</div>`;
      if (rec.free > 0) inner += `<div class="cal-free-dot" title="${rec.free.toFixed(1)}h free"></div>`;
    }

    if (rec.clickable) {
      cls += ' clickable';
      cell.title = rec.excluded ? 'Tap to include this day again' : 'Tap to exclude this day';
      cell.addEventListener('click', () => {
        if (excludedDates.has(rec.iso)) {
          excludedDates.delete(rec.iso);
        } else {
          excludedDates.add(rec.iso);
        }
        calculate();
      });
    }

    cell.className = cls;
    cell.innerHTML = inner;
    calGrid.appendChild(cell);
  });
}

// set default month to current month
const today = new Date();
document.getElementById('monthPicker').value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;

function updateManualUI() {
  const strategy = document.getElementById('allocStrategy').value;
  document.getElementById('manualPctRow').style.display = (strategy === 'manual') ? 'block' : 'none';
  document.getElementById('manualPctName').textContent = document.getElementById('nameA').value || 'Childminder A';
  document.getElementById('manualPctVal').textContent = document.getElementById('manualPct').value;
}

document.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('input', () => { updateManualUI(); calculate(); });
  el.addEventListener('change', () => { updateManualUI(); calculate(); });
});

updateManualUI();
calculate();
