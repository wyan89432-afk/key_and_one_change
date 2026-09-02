const state = { headers: [], data: [], matches: [] };
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

function oneChangeVariants(number) {
  const s = normalize3(number), out = new Set();
  if (!/^\d{3}$/.test(s)) return [];
  for (let i = 0; i < 3; i++) {
    const d = Number(s[i]);
    for (const delta of [-1, 1]) {
      const nd = d + delta;
      if (nd >= 0 && nd <= 9) {
        const a = s.split('');
        a[i] = String(nd);
        out.add(a.join(''));
      }
    }
  }
  return [...out];
}

function isOneChange(a, b) {
  const x = normalize3(a), y = normalize3(b);
  if (!/^\d{3}$/.test(x) || !/^\d{3}$/.test(y)) return false;
  let changed = 0;
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) {
      changed++;
      if (Math.abs(Number(x[i]) - Number(y[i])) !== 1) return false;
    }
  }
  return changed === 1;
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

// Convert the table to the exact checking order: column 1 row 1→last row,
// then column 2 row 1→last row, and so on.
function cellAtLinear(linear) {
  const rows = state.data.length;
  const cols = state.headers.length;
  const total = rows * cols;
  if (linear < 0 || linear >= total) return null;
  const col = Math.floor(linear / rows);
  const row = linear % rows;
  return { linear, row, col, value: state.data[row]?.[col] || '' };
}

// IMPORTANT: Do not color a partial match. A valid result is a COMPLETE
// sequence containing every pasted number.
// 0p = consecutive cells.
// 1p = one cell gap between each checked number.
// 2p = two cell gaps, etc.
function findCompleteSequence(inputs, startLinear, p) {
  if (!inputs.length) return null;
  const rows = state.data.length;
  const cols = state.headers.length;
  const total = rows * cols;
  const step = p + 1;

  for (let start = Math.max(0, startLinear); start < total; start++) {
    const sequence = [];
    let valid = true;

    for (let i = 0; i < inputs.length; i++) {
      const linear = start + i * step;
      const cell = cellAtLinear(linear);
      if (!cell || !isOneChange(inputs[i], cell.value)) {
        valid = false;
        break;
      }
      sequence.push({
        ...cell,
        input: inputs[i],
        index: i + 1
      });
    }

    if (valid) return sequence;
  }
  return null;
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

  // Search for ONE complete sequence. Only after all numbers match do we
  // apply the five-color cycle to the matched cells.
  const sequence = findCompleteSequence(nums, 0, p);
  const matches = [];
  const highlights = new Map();

  if (sequence) {
    sequence.forEach((match, i) => {
      const item = { ...match, color: COLORS[i % COLORS.length] };
      matches.push(item);
      highlights.set(`${match.col}:${match.row}`, item);
    });
  }

  state.matches = matches;
  renderFixedTable(highlights);
  renderResults(matches, nums.length, p);
}

function renderResults(matches, total, p) {
  if (matches.length === total) {
    $('resultStatus').textContent = `Complete: ${total}/${total} numbers matched using ${p}p.`;
  } else {
    $('resultStatus').textContent = `No complete ${total}-number sequence found using ${p}p. Nothing was colored.`;
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

$('clearBtn').addEventListener('click', () => {
  $('inputNumbers').value = '';
  $('pattern').value = '0p';
  $('resultTable').innerHTML = '';
  $('inputStats').textContent = '0 numbers';
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
