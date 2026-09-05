const state = { headers: [], data: [], matches: [], sequentialOnly: false };
const COLORS = ['yellow', 'green', 'red', 'blue', 'brown'];
const $ = id => document.getElementById(id);

function normalize3(value) {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const s = String(value).trim();
  const n = Number(s);
  if (!Number.isNaN(n) && Number.isFinite(n)) return String(Math.trunc(n)).padStart(3, '0').slice(-3);
  const digits = s.replace(/\D/g, '');
  return digits ? digits.padStart(3, '0').slice(-3) : '';
}

function parseP(value) {
  const m = String(value).trim().toLowerCase().match(/^([0-7])p$/);
  return m ? Number(m[1]) : null;
}

// 1-change rule:
// - Digit positions/order do NOT matter.
// - Exactly two digits must be shared.
// - The remaining digit changes by +1 or -1.
// - Digits are circular, so 0 <-> 9 is also one change.
function isOneChange(a, b) {
  const x = normalize3(a), y = normalize3(b);
  if (!/^\d{3}$/.test(x) || !/^\d{3}$/.test(y)) return false;

  const countA = Array(10).fill(0);
  const countB = Array(10).fill(0);
  for (const ch of x) countA[Number(ch)]++;
  for (const ch of y) countB[Number(ch)]++;

  let shared = 0;
  for (let d = 0; d <= 9; d++) shared += Math.min(countA[d], countB[d]);
  if (shared !== 2) return false;

  let from = -1;
  let to = -1;
  for (let d = 0; d <= 9; d++) {
    if (countA[d] > countB[d]) from = d;
    if (countB[d] > countA[d]) to = d;
  }

  if (from < 0 || to < 0) return false;
  const diff = Math.abs(from - to);
  return diff === 1 || diff === 9;
}

function loadMatrix(matrix, sourceName = 'Uploaded table') {
  if (!Array.isArray(matrix) || matrix.length < 2) throw new Error('The table needs a title row and data rows.');
  const width = Math.max(...matrix.map(r => Array.isArray(r) ? r.length : 0));
  state.headers = Array.from({ length: width }, (_, c) => normalize3(matrix[0]?.[c]) || String(matrix[0]?.[c] ?? '').trim());
  state.data = matrix.slice(1).map(row => Array.from({ length: width }, (_, c) => normalize3(row?.[c])));
  renderFixedTable();
  $('tableMeta').textContent = `${state.data.length} rows × ${state.headers.length} columns • ${sourceName}`;
  $('resultStatus').textContent = 'Ready. Enter 0p–7p and paste numbers, then Calculate.';
  calculate();
}

function renderFixedTable(highlights = new Map()) {
  if (!state.headers.length) return;
  const table = document.createElement('table');
  table.className = 'data-table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  state.headers.forEach((h, c) => {
    const th = document.createElement('th');
    th.textContent = h || `C${c + 1}`;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  state.data.forEach((row, r) => {
    const tr = document.createElement('tr');
    row.forEach((v, c) => {
      const td = document.createElement('td');
      td.textContent = v;
      const hit = highlights.get(`${c}:${r}`);
      if (hit) {
        td.classList.add(`hit-${hit.color}`);
        td.title = `${hit.input} → ${v} • row ${r + 1}, column ${state.headers[c]}`;
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  const wrap = $('fixedTable');
  wrap.innerHTML = '';
  wrap.appendChild(table);
}

function getNumbers() {
  return $('inputNumbers').value.split(/[\s,;]+/).map(normalize3).filter(v => /^\d{3}$/.test(v));
}

// Find every individual 1-change match. Individual matches are colored
// immediately; a complete sequence is not required unless Sequential is on.
function findAllMatches(inputs) {
  const matches = [];
  const rows = state.data.length;
  const cols = state.headers.length;

  inputs.forEach((input, inputIndex) => {
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const value = state.data[row]?.[col] || '';
        if (isOneChange(input, value)) {
          matches.push({
            linear: col * rows + row,
            row,
            col,
            value,
            input,
            index: inputIndex + 1,
            color: COLORS[inputIndex % COLORS.length]
          });
        }
      }
    }
  });

  return matches;
}

// Sequential mode keeps only matches that form an ordered chain inside the
// same column: yellow -> green -> red -> blue -> brown (then yellow again).
// Rows must increase downward. The chain may have gaps; it only needs to keep
// the required color/input order. Single isolated matches are removed.
function filterSequentialMatches(matches) {
  if (!matches.length) return [];

  const byColumn = new Map();
  matches.forEach(m => {
    if (!byColumn.has(m.col)) byColumn.set(m.col, []);
    byColumn.get(m.col).push(m);
  });

  const kept = [];
  byColumn.forEach(columnMatches => {
    columnMatches.sort((a, b) => a.row - b.row || a.index - b.index);

    for (let i = 0; i < columnMatches.length; i++) {
      const start = columnMatches[i];
      let chain = [start];
      let nextIndex = (start.index % COLORS.length) + 1;
      let lastRow = start.row;

      for (let j = i + 1; j < columnMatches.length; j++) {
        const candidate = columnMatches[j];
        if (candidate.row <= lastRow) continue;
        if (candidate.index === nextIndex) {
          chain.push(candidate);
          lastRow = candidate.row;
          nextIndex = (nextIndex % COLORS.length) + 1;
        }
      }

      // Keep only genuine ordered pairs/chains. If all five colors are used,
      // the next expected color can wrap to yellow naturally.
      if (chain.length >= 2) kept.push(...chain);
    }
  });

  // The same cell can be reached by more than one starting point. De-duplicate.
  const unique = new Map();
  kept.forEach(m => unique.set(`${m.col}:${m.row}:${m.index}`, m));
  return Array.from(unique.values()).sort((a, b) => a.col - b.col || a.row - b.row || a.index - b.index);
}

function calculate() {
  if (!state.data.length) return;
  const p = parseP($('pattern').value);
  const nums = getNumbers();
  $('inputStats').textContent = `${nums.length} number${nums.length === 1 ? '' : 's'}`;

  if (p === null) {
    $('resultStatus').textContent = 'Please enter 0p, 1p, 2p, 3p, 4p, 5p, 6p or 7p.';
    return;
  }

  if (!nums.length) {
    $('resultStatus').textContent = 'Paste at least one 3-digit number.';
    renderFixedTable();
    $('resultTable').innerHTML = '';
    return;
  }

  const allMatches = findAllMatches(nums);
  const matches = state.sequentialOnly ? filterSequentialMatches(allMatches) : allMatches;
  const highlights = new Map();

  // If multiple inputs match the same cell, keep the earliest input's color.
  matches.forEach(match => {
    const key = `${match.col}:${match.row}`;
    if (!highlights.has(key)) highlights.set(key, match);
  });

  state.matches = matches;
  renderFixedTable(highlights);
  renderResults(matches, nums.length, p, allMatches.length);
}

function renderResults(matches, total, p, allCount = matches.length) {
  if (state.sequentialOnly) {
    $('resultStatus').textContent = matches.length
      ? `${matches.length} sequential 1-change match${matches.length === 1 ? '' : 'es'} kept • ${allCount - matches.length} non-sequential hidden • ${p}p selected.`
      : `No sequential 1-change matches found • ${allCount} individual matches hidden • ${p}p selected.`;
  } else {
    $('resultStatus').textContent = matches.length
      ? `${matches.length} individual 1-change match${matches.length === 1 ? '' : 'es'} found • ${p}p selected.`
      : `No individual 1-change matches found • ${p}p selected.`;
  }

  const wrap = $('resultTable');
  wrap.innerHTML = '';
  if (!matches.length) return;

  const table = document.createElement('table');
  table.className = 'result-table';
  table.innerHTML = '<thead><tr><th>#</th><th>Input</th><th>Matched</th><th>Column</th><th>Row</th><th>Color</th></tr></thead>';
  const body = document.createElement('tbody');

  matches.forEach(m => {
    const tr = document.createElement('tr');
    [m.index, m.input, m.value, state.headers[m.col], m.row + 1, m.color].forEach((v, i) => {
      const td = document.createElement('td');
      td.textContent = v;
      if (i === 5) td.className = `badge badge-${m.color}`;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  table.appendChild(body);
  wrap.appendChild(table);
}

$('inputNumbers').addEventListener('input', () => {
  $('inputStats').textContent = `${getNumbers().length} numbers`;
});

$('calculateBtn').addEventListener('click', calculate);
$('pattern').addEventListener('keydown', e => {
  if (e.key === 'Enter') calculate();
});

$('sequentialBtn').addEventListener('click', () => {
  state.sequentialOnly = !state.sequentialOnly;
  const btn = $('sequentialBtn');
  btn.classList.toggle('active', state.sequentialOnly);
  btn.textContent = state.sequentialOnly ? 'အစဉ်လိုက် ✓' : 'အစဉ်လိုက်';
  calculate();
});

$('clearBtn').addEventListener('click', () => {
  $('inputNumbers').value = '';
  $('pattern').value = '0p';
  $('resultTable').innerHTML = '';
  $('inputStats').textContent = '0 numbers';
  if (state.sequentialOnly) {
    state.sequentialOnly = false;
    $('sequentialBtn').classList.remove('active');
    $('sequentialBtn').textContent = 'အစဉ်လိုက်';
  }
  if (state.data.length) renderFixedTable();
  $('resultStatus').textContent = state.data.length ? 'Cleared.' : 'Upload the fixed table to begin.';
});

$('fileInput').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    loadMatrix(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }), file.name);
  } catch (err) {
    $('resultStatus').textContent = `Could not read file: ${err.message}`;
  }
});

async function loadDefault() {
  try {
    const res = await fetch('fixed-table.csv', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const wb = XLSX.read(await res.text(), { type: 'string' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    loadMatrix(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }), 'fixed-table.csv');
  } catch {
    $('resultStatus').textContent = 'Upload the fixed table to begin.';
  }
}

loadDefault();
