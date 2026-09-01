// England & Wales bank holidays (extend this list for future years as needed)
const BANK_HOLIDAYS = new Set([
  '2025-01-01','2025-04-18','2025-04-21','2025-05-05','2025-05-26','2025-08-25','2025-12-25','2025-12-26',
  '2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-28',
  '2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28'
]);

const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const MIN_CM = 1;
const MAX_CM = 4;         // colours cm-c0..cm-c3 are defined in styles.css
const PALETTE_SIZE = 4;

// ---- state: the DOM is rebuilt from these, so edits survive add/remove ----

// each childminder: { name, rate, pct }  (pct = relative weight for the custom split)
let childminders = [
  { name: 'Childminder A', rate: 5.50, pct: 50 },
  { name: 'Childminder B', rate: 7.50, pct: 50 }
];

// schedule[0..4] = Mon..Fri, { cm: <childminder index> | -1 for none, hours: <number> }
let schedule = [
  { cm: 0, hours: 8.5 },
  { cm: 0, hours: 8.5 },
  { cm: 0, hours: 8.5 },
  { cm: 0, hours: 8.5 },
  { cm: 1, hours: 8.5 }
];

const excludedDates = new Set(); // ISO date strings the user has tapped to exclude on the calendar

// ---- element refs ----
const cmListEl = document.getElementById('cmList');
const addCmEl = document.getElementById('addCm');
const schedBodyEl = document.getElementById('schedBody');
const legendEl = document.getElementById('legend');
const manualWrapEl = document.getElementById('manualPctWrap');
const manualRowsEl = document.getElementById('manualPctRows');
const allocStrategyEl = document.getElementById('allocStrategy');

// ---- helpers ----
function pad(n) { return n.toString().padStart(2, '0'); }
function isoDate(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function fmtHours(n) { return n.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' hrs'; }
function fmtMoney(n) { return '£' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function cmClass(i) { return 'cm-c' + (i % PALETTE_SIZE); }
function defaultName(i) { return 'Childminder ' + String.fromCharCode(65 + i); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// ---- renderers (rebuild DOM from state) ----

function renderChildminders() {
  cmListEl.innerHTML = '';
  childminders.forEach((cm, i) => {
    const block = document.createElement('div');
    block.className = 'cm-block ' + cmClass(i);
    block.innerHTML = `
      <div class="cm-block-head">
        <span class="cm-tag">Childminder ${i + 1}</span>
        <button type="button" class="cm-remove" data-idx="${i}"${childminders.length <= MIN_CM ? ' hidden' : ''}>Remove</button>
      </div>
      <div class="two-col">
        <div class="field">
          <label>Name</label>
          <input type="text" class="cmName" data-idx="${i}" value="${escapeHtml(cm.name)}">
        </div>
        <div class="field">
          <label>Rate (£/hr)</label>
          <input type="number" class="cmRate" data-idx="${i}" min="0" step="0.01" value="${cm.rate}">
        </div>
      </div>
    `;
    cmListEl.appendChild(block);
  });
  const atMax = childminders.length >= MAX_CM;
  addCmEl.disabled = atMax;
  addCmEl.textContent = atMax ? `Maximum ${MAX_CM} childminders` : '+ Add childminder';
}

function renderSchedule() {
  schedBodyEl.innerHTML = '';
  DAY_NAMES.forEach((day, i) => {
    const entry = schedule[i];
    const opts = ['<option value="-1">None</option>']
      .concat(childminders.map((cm, ci) => `<option value="${ci}">${escapeHtml(cm.name)}</option>`))
      .join('');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="day-label">${day}</td>
      <td class="cm-col"><select class="cmSelect" data-day="${i}">${opts}</select></td>
      <td class="hrs-col"><input type="number" class="hrsInput" data-day="${i}" min="0" step="0.25" value="${entry.hours}"></td>
    `;
    schedBodyEl.appendChild(tr);
    const valid = entry.cm != null && entry.cm >= 0 && entry.cm < childminders.length;
    tr.querySelector('.cmSelect').value = String(valid ? entry.cm : -1);
  });
}

function renderManualRows() {
  manualRowsEl.innerHTML = '';
  childminders.forEach((cm, i) => {
    const row = document.createElement('div');
    row.className = 'manual-row';
    row.innerHTML = `
      <span class="manual-name">${escapeHtml(cm.name)}</span>
      <input type="range" class="cmPct" data-idx="${i}" min="0" max="100" step="5" value="${cm.pct}">
      <span class="manual-val" data-idx="${i}">${cm.pct}</span>
    `;
    manualRowsEl.appendChild(row);
  });
}

function renderLegend() {
  legendEl.innerHTML = '';
  childminders.forEach((cm, i) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-swatch cm ${cmClass(i)}"></span>${escapeHtml(cm.name)}`;
    legendEl.appendChild(item);
  });
  legendEl.insertAdjacentHTML('beforeend',
    `<div class="legend-item"><span class="legend-swatch holiday"></span>Bank holiday</div>` +
    `<div class="legend-item"><span class="legend-swatch free"></span>Free hours used</div>`);
}

function updateManualUI() {
  manualWrapEl.style.display = (allocStrategyEl.value === 'manual') ? 'block' : 'none';
}

function refreshAll() {
  renderChildminders();
  renderSchedule();
  renderManualRows();
  renderLegend();
  updateManualUI();
  calculate();
}

// ---- add / remove childminders ----

function addChildminder() {
  if (childminders.length >= MAX_CM) return;
  childminders.push({ name: defaultName(childminders.length), rate: 0, pct: 0 });
  refreshAll();
}

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

// ---- event wiring (delegated onto containers that persist across re-renders) ----

cmListEl.addEventListener('input', e => {
  const idx = +e.target.dataset.idx;
  if (e.target.classList.contains('cmName')) {
    childminders[idx].name = e.target.value;
    // the name shows in several places; refresh those but NOT the cards (would drop focus)
    renderSchedule();
    renderManualRows();
    renderLegend();
    calculate();
  } else if (e.target.classList.contains('cmRate')) {
    childminders[idx].rate = parseFloat(e.target.value) || 0;
    calculate();
  }
});

cmListEl.addEventListener('click', e => {
  if (e.target.classList.contains('cm-remove')) removeChildminder(+e.target.dataset.idx);
});

addCmEl.addEventListener('click', addChildminder);

schedBodyEl.addEventListener('input', e => {
  if (!e.target.classList.contains('hrsInput')) return;
  schedule[+e.target.dataset.day].hours = parseFloat(e.target.value) || 0;
  calculate();
});

schedBodyEl.addEventListener('change', e => {
  if (!e.target.classList.contains('cmSelect')) return;
  schedule[+e.target.dataset.day].cm = parseInt(e.target.value, 10);
  calculate();
});

manualRowsEl.addEventListener('input', e => {
  if (!e.target.classList.contains('cmPct')) return;
  const idx = +e.target.dataset.idx;
  childminders[idx].pct = parseFloat(e.target.value) || 0;
  const valEl = manualRowsEl.querySelector(`.manual-val[data-idx="${idx}"]`);
  if (valEl) valEl.textContent = childminders[idx].pct;
  calculate();
});

['monthPicker', 'freeHours', 'excludeHolidays'].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener('input', calculate);
  el.addEventListener('change', calculate);
});
allocStrategyEl.addEventListener('change', () => { updateManualUI(); calculate(); });

// ---- the calculation ----

function calculate() {
  const monthVal = document.getElementById('monthPicker').value; // "YYYY-MM"
  if (!monthVal) return;
  const [year, monthNum] = monthVal.split('-').map(Number);
  const monthIndex = monthNum - 1;

  const excludeHolidays = document.getElementById('excludeHolidays').checked;
  const freeHoursPerWeek = parseFloat(document.getElementById('freeHours').value) || 0;
  const strategy = allocStrategyEl.value;

  const n = childminders.length;
  const rates = childminders.map(c => c.rate);
  const pcts = childminders.map(c => c.pct);

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weeks = {}; // weekKey -> { hours: number[n], days: [dayRecord] }
  const holidaysHit = [];
  const dayRecords = []; // one entry per calendar day in the month

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dow = dateObj.getDay(); // 0=Sun..6=Sat
    const iso = isoDate(year, monthIndex, d);
    const isWeekend = (dow === 0 || dow === 6);
    const isHoliday = BANK_HOLIDAYS.has(iso);

    const rec = { date: d, iso, dow, isWeekend, isHoliday, cm: -1, hours: 0, free: 0, paid: 0, cost: 0, clickable: false, excluded: false };

    if (isWeekend) { dayRecords.push(rec); continue; }
    if (isHoliday) {
      holidaysHit.push(iso);
      if (excludeHolidays) { dayRecords.push(rec); continue; }
      // otherwise fall through and treat as a normal booked weekday
    }

    const entry = schedule[dow - 1]; // 0=Mon..4=Fri
    const cmIdx = entry ? entry.cm : -1;
    if (!entry || cmIdx < 0 || cmIdx >= n || entry.hours <= 0) { dayRecords.push(rec); continue; }

    rec.clickable = true;
    rec.cm = cmIdx; // kept for styling even if the day is excluded

    if (excludedDates.has(iso)) { rec.excluded = true; dayRecords.push(rec); continue; }

    rec.hours = entry.hours;

    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() - (dow - 1));
    const weekKey = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;

    if (!weeks[weekKey]) weeks[weekKey] = { hours: new Array(n).fill(0), days: [] };
    weeks[weekKey].hours[cmIdx] += entry.hours;
    weeks[weekKey].days.push(rec);
    dayRecords.push(rec);
  }

  // split one week's free hours across the childminders
  function splitFree(weekHours, freeForWeek) {
    const alloc = new Array(n).fill(0);
    const weekTotal = weekHours.reduce((a, b) => a + b, 0);
    if (weekTotal <= 0 || freeForWeek <= 0) return alloc;

    if (strategy === 'proportional') {
      for (let i = 0; i < n; i++) alloc[i] = freeForWeek * (weekHours[i] / weekTotal);
      return alloc;
    }

    if (strategy === 'expensive-first' || strategy === 'cheaper-first') {
      const order = childminders.map((_, i) => i).sort((a, b) =>
        strategy === 'expensive-first' ? rates[b] - rates[a] : rates[a] - rates[b]);
      let remaining = freeForWeek;
      for (const i of order) {
        const take = Math.min(remaining, weekHours[i]);
        alloc[i] = take;
        remaining -= take;
        if (remaining <= 0) break;
      }
      return alloc;
    }

    // manual: relative weights, capped at each childminder's booked hours,
    // any leftover redistributed to those with spare capacity
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
    return alloc;
  }

  const total = new Array(n).fill(0);
  const free = new Array(n).fill(0);
  const paid = new Array(n).fill(0);

  Object.values(weeks).forEach(w => {
    const weekTotal = w.hours.reduce((a, b) => a + b, 0);
    const freeForWeek = Math.min(freeHoursPerWeek, weekTotal);
    const alloc = splitFree(w.hours, freeForWeek);
    for (let i = 0; i < n; i++) {
      total[i] += w.hours[i];
      free[i] += alloc[i];
      paid[i] += w.hours[i] - alloc[i];
    }

    // spread this week's free allocation across its days, chronologically, per childminder,
    // so the calendar can show a day-by-day breakdown
    const balance = alloc.slice();
    w.days.slice().sort((a, b) => a.date - b.date).forEach(rec => {
      const take = Math.min(balance[rec.cm], rec.hours);
      rec.free = take;
      rec.paid = rec.hours - take;
      rec.cost = rec.paid * rates[rec.cm];
      balance[rec.cm] -= take;
    });
  });

  const cost = paid.map((h, i) => h * rates[i]);
  const grand = cost.reduce((a, b) => a + b, 0);

  // ---- weekly breakdown ----
  // group every weekday of the month (regardless of booking) into calendar weeks
  // keyed by their Monday, so "Week N" numbering matches the weeks the month actually spans
  const orderedWeekKeys = [];
  const weekRange = {}; // weekKey -> { start: dayOfMonth, end: dayOfMonth }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const dow = dateObj.getDay();
    if (dow === 0 || dow === 6) continue;
    const monday = new Date(dateObj);
    monday.setDate(dateObj.getDate() - (dow - 1));
    const weekKey = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    if (!weekRange[weekKey]) {
      orderedWeekKeys.push(weekKey);
      weekRange[weekKey] = { start: d, end: d };
    } else {
      weekRange[weekKey].end = d;
    }
  }

  const monthAbbrev = new Date(year, monthIndex, 1).toLocaleDateString('en-GB', { month: 'short' });
  const weekSummaries = orderedWeekKeys.map((wk, idx) => {
    const w = weeks[wk];
    let freeSum = 0, costSum = 0;
    if (w) {
      w.days.forEach(rec => { freeSum += rec.free; costSum += rec.cost; });
    }
    const r = weekRange[wk];
    const range = (r.start === r.end) ? `${r.start} ${monthAbbrev}` : `${r.start}–${r.end} ${monthAbbrev}`;
    return { label: `Week ${idx + 1}`, range, free: freeSum, cost: costSum };
  });

  document.getElementById('weekSummaries').innerHTML = weekSummaries.map(w => `
    <div class="week-row">
      <div class="week-head">
        <span class="week-label">${w.label}</span>
        <span class="week-range">${w.range}</span>
      </div>
      <div class="row"><span class="label">Funded hours</span><span class="value">${fmtHours(w.free)}</span></div>
      <div class="row paid"><span class="label">Cost</span><span class="value">${fmtMoney(w.cost)}</span></div>
    </div>
  `).join('');

  // ---- per-childminder summaries ----
  document.getElementById('cmSummaries').innerHTML = childminders.map((cm, i) => `
    <div class="cm-summary ${cmClass(i)}">
      <div class="name">${escapeHtml(cm.name)}</div>
      <div class="row"><span class="label">Total hours</span><span class="value">${fmtHours(total[i])}</span></div>
      <div class="row"><span class="label">Free hours used</span><span class="value">${fmtHours(free[i])}</span></div>
      <div class="row paid"><span class="label">Paid hours</span><span class="value">${fmtHours(paid[i])}</span></div>
      <div class="row paid"><span class="label">Cost</span><span class="value">${fmtMoney(cost[i])}</span></div>
    </div>
  `).join('');

  document.getElementById('grandTotal').textContent = fmtMoney(grand);

  // ---- bank holiday note ----
  const holidayNote = document.getElementById('holidayNote');
  if (holidaysHit.length > 0) {
    const list = holidaysHit
      .map(s => new Date(s + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))
      .join(', ');
    holidayNote.innerHTML = excludeHolidays
      ? `<strong>Bank holidays excluded this month:</strong> ${list}`
      : `<strong>Bank holidays this month (still booked &amp; charged):</strong> ${list}`;
  } else {
    holidayNote.innerHTML = `<strong>No bank holidays</strong> fall in this month.`;
  }

  // ---- calendar ----
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
      cls += ' excluded cm ' + cmClass(rec.cm);
      inner += `<div class="cal-excluded-label">Excluded</div>`;
      if (rec.isHoliday) inner += `<div class="cal-holiday-label">Holiday</div>`;
    } else if (rec.cm < 0) {
      cls += ' unscheduled';
      if (rec.isHoliday) inner += `<div class="cal-holiday-label">Holiday</div>`;
    } else {
      cls += ' cm ' + cmClass(rec.cm);
      inner += `<div class="cal-hours">${rec.hours.toLocaleString(undefined, { maximumFractionDigits: 1 })}h</div>`;
      inner += `<div class="cal-cost">${fmtMoney(rec.cost)}</div>`;
      if (rec.isHoliday) inner += `<div class="cal-holiday-label">Holiday</div>`;
      if (rec.free > 0) inner += `<div class="cal-free-dot" title="${rec.free.toFixed(1)}h free"></div>`;
    }

    if (rec.clickable) {
      cls += ' clickable';
      cell.title = rec.excluded ? 'Tap to include this day again' : 'Tap to exclude this day';
      cell.addEventListener('click', () => {
        if (excludedDates.has(rec.iso)) excludedDates.delete(rec.iso);
        else excludedDates.add(rec.iso);
        calculate();
      });
    }

    cell.className = cls;
    cell.innerHTML = inner;
    calGrid.appendChild(cell);
  });
}

// set default month to the current month, then build everything
const today = new Date();
document.getElementById('monthPicker').value = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;

refreshAll();
