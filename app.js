const state = {
  headers: [],
  data: [],
  matches: [],
  sequentialOnly: false,
  sequentialChains: [],
  rowCount: 24
};

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

// 1-change: digit order does not matter. Exactly two digits stay the same;
// the third digit changes by +/-1. 0 and 9 are adjacent on the circular wheel.
function isOneChange(a, b) {
  const x = normalize3(a), y = normalize3(b);
  if (!/^\d{3}$/.test(x) || !/^\d{3}$/.test(y)) return false;
  const A = Array(10).fill(0), B = Array(10).fill(0);
  for (const ch of x) A[Number(ch)]++;
  for (const ch of y) B[Number(ch)]++;
  let shared = 0;
  for (let d = 0; d <= 9; d++) shared += Math.min(A[d], B[d]);
  if (shared !== 2) return false;
  let from = -1, to = -1;
  for (let d = 0; d <= 9; d++) {
    if (A[d] > B[d]) from = d;
    if (B[d] > A[d]) to = d;
  }
  if (from < 0 || to < 0) return false;
  const diff = Math.abs(from - to);
  return diff === 1 || diff === 9;
}

function updateMeta(sourceName = 'Edited working table') {
  $('tableMeta').textContent = `${state.data.length} rows × ${state.headers.length} columns • ${sourceName}`;
}

// Editing is intentionally available ONLY in the 1 Change Table.
function makeWorkingCellEditable(td, row, col) {
  td.contentEditable = 'true';
  td.spellcheck = false;
  td.title = 'Tap/click to edit this number';
  td.addEventListener('focus', () => td.classList.add('editing'));
  td.addEventListener('blur', () => {
    state.data[row][col] = normalize3(td.textContent.trim());
    td.textContent = state.data[row][col];
    td.classList.remove('editing');
    updateMeta('Edited working table');
    calculate();
  });
  td.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); td.blur(); }
  });
}

function makeWorkingHeaderEditable(th, col) {
  th.contentEditable = 'true';
  th.spellcheck = false;
  th.title = 'Tap/click to edit column heading';
  th.addEventListener('focus', () => th.classList.add('editing'));
  th.addEventListener('blur', () => {
    state.headers[col] = th.textContent.trim();
    th.textContent = state.headers[col] || `C${col + 1}`;
    th.classList.remove('editing');
    updateMeta('Edited working table');
    calculate();
  });
  th.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); th.blur(); }
  });
}

function loadMatrix(matrix, sourceName = 'Uploaded table') {
  if (!Array.isArray(matrix) || matrix.length < 2) throw new Error('The table needs a title row and data rows.');
  const width = Math.max(...matrix.map(r => Array.isArray(r) ? r.length : 0));
  state.headers = Array.from({ length: width }, (_, c) => normalize3(matrix[0]?.[c]) || String(matrix[0]?.[c] ?? '').trim());
  state.data = matrix.slice(1).map(row => Array.from({ length: width }, (_, c) => normalize3(row?.[c])));
  while (state.data.length < 24) state.data.push(Array(width).fill(''));
  state.rowCount = state.data.length;
  state.sequentialChains = [];
  renderFixedTable();
  updateMeta(sourceName);
  $('resultStatus').textContent = 'Ready. Enter 0p–7p and paste numbers, then Calculate.';
  calculate();
}

// FIXED TABLE = display-only source. No edit, no color, no arrows, no logic.
function renderFixedTable() {
  if (!state.headers.length) return;
  const table = document.createElement('table');
  table.className = 'data-table fixed-data-table';

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  const rowHead = document.createElement('th');
  rowHead.textContent = '0';
  rowHead.className = 'row-index-head';
  hr.appendChild(rowHead);
  state.headers.forEach((h, c) => {
    const th = document.createElement('th');
    th.textContent = h || `C${c + 1}`;
    th.dataset.col = c;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  state.data.forEach((row, r) => {
    const tr = document.createElement('tr');
    const indexTd = document.createElement('td');
    indexTd.textContent = r + 1;
    indexTd.className = 'row-index';
    tr.appendChild(indexTd);
    row.forEach((v, c) => {
      const td = document.createElement('td');
      td.textContent = v;
      td.dataset.row = r;
      td.dataset.col = c;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  const wrap = $('fixedTable');
  wrap.innerHTML = '';
  wrap.appendChild(table);
}

// 1 CHANGE TABLE = the only working/logic table. All edits, colors and arrows
// happen here; Fixed Table above stays untouched visually.
function renderOneChangeTable(highlights = new Map()) {
  const wrap = $('resultTable');
  wrap.innerHTML = '';
  if (!state.headers.length) return;

  const table = document.createElement('table');
  table.className = 'data-table one-change-data-table';

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  const rowHead = document.createElement('th');
  rowHead.textContent = '0';
  rowHead.className = 'row-index-head';
  hr.appendChild(rowHead);

  state.headers.forEach((h, c) => {
    const th = document.createElement('th');
    th.textContent = h || `C${c + 1}`;
    th.dataset.col = c;
    makeWorkingHeaderEditable(th, c);
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  state.data.forEach((row, r) => {
    const tr = document.createElement('tr');
    const indexTd = document.createElement('td');
    indexTd.textContent = r + 1;
    indexTd.className = 'row-index';
    tr.appendChild(indexTd);

    row.forEach((v, c) => {
      const td = document.createElement('td');
      td.textContent = v;
      td.dataset.row = r;
      td.dataset.col = c;
      const hit = highlights.get(`${c}:${r}`);
      if (hit) {
        td.classList.add(`hit-${hit.color}`);
        td.title = `${hit.input} → ${v} • row ${r + 1}, column ${state.headers[c]}`;
      }
      makeWorkingCellEditable(td, r, c);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrap.appendChild(table);
  requestAnimationFrame(() => drawSequentialArrows());
}

function getNumbers() {
  return $('inputNumbers').value.split(/[\s,;]+/).map(normalize3).filter(v => /^\d{3}$/.test(v));
}

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

// 0p = adjacent cells (step 1), 1p = one cell skipped (step 2), ... 7p.
// Pasted-number order is exact: yellow -> green -> red -> blue -> brown.
// Column-major order lets a chain continue from the end of one column into
// the beginning of the next column.
function filterSequentialMatches(matches, p, inputCount) {
  state.sequentialChains = [];
  if (!matches.length || !inputCount) return [];

  const byIndex = new Map();
  matches.forEach(m => {
    if (!byIndex.has(m.index)) byIndex.set(m.index, []);
    byIndex.get(m.index).push(m);
  });
  byIndex.forEach(list => list.sort((a, b) => a.linear - b.linear));

  const starts = byIndex.get(1) || [];
  const step = p + 1;
  for (const start of starts) {
    const chain = [start];
    let wanted = 2;
    let expected = start.linear + step;
    while (wanted <= inputCount) {
      const next = (byIndex.get(wanted) || []).find(m => m.linear === expected);
      if (!next) break;
      chain.push(next);
      wanted++;
      expected += step;
    }
    if (chain.length === inputCount) state.sequentialChains.push(chain);
  }

  const unique = new Map();
  state.sequentialChains.forEach(chain => chain.forEach(m => {
    const key = `${m.col}:${m.row}:${m.index}`;
    if (!unique.has(key)) unique.set(key, m);
  }));
  return Array.from(unique.values()).sort((a, b) => a.linear - b.linear || a.index - b.index);
}

function drawSequentialArrows() {
  const wrap = $('resultTable');
  const old = wrap.querySelector('.arrow-layer');
  if (old) old.remove();
  if (!state.sequentialOnly || !state.sequentialChains.length) return;

  const table = wrap.querySelector('.one-change-data-table');
  if (!table) return;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('arrow-layer');
  svg.setAttribute('width', table.offsetWidth);
  svg.setAttribute('height', table.offsetHeight);
  svg.setAttribute('viewBox', `0 0 ${table.offsetWidth} ${table.offsetHeight}`);
  svg.setAttribute('aria-hidden', 'true');

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'blueArrowHead');
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('refX', '7');
  marker.setAttribute('refY', '4');
  marker.setAttribute('orient', 'auto');
  const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  head.setAttribute('d', 'M0,0 L8,4 L0,8 Z');
  head.setAttribute('fill', '#1683ff');
  marker.appendChild(head);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const point = m => table.querySelector(`td[data-row="${m.row}"][data-col="${m.col}"]`);
  const rect = el => {
    const r = el.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    return {
      left: r.left - wr.left + wrap.scrollLeft,
      right: r.right - wr.left + wrap.scrollLeft,
      top: r.top - wr.top + wrap.scrollTop,
      bottom: r.bottom - wr.top + wrap.scrollTop,
      midY: (r.top + r.bottom) / 2 - wr.top + wrap.scrollTop
    };
  };

  const addArrow = (a, b) => {
    const ca = point(a), cb = point(b);
    if (!ca || !cb) return;
    const A = rect(ca), B = rect(cb);
    let d;

    if (a.col === b.col) {
      const x = Math.max(A.right, B.right) + 12;
      d = `M ${A.right + 2} ${A.midY} C ${x} ${A.midY}, ${x} ${B.midY}, ${B.right + 2} ${B.midY}`;
    } else {
      const rightward = b.col > a.col;
      const sourceX = rightward ? A.right + 2 : A.left - 2;
      const gutterX = rightward ? A.right + 8 : A.left - 8;
      const targetGutterX = rightward ? B.left - 8 : B.right + 8;
      const targetX = rightward ? B.left - 2 : B.right + 2;
      const midY = (A.midY + B.midY) / 2;
      d = `M ${sourceX} ${A.midY} C ${gutterX} ${A.midY}, ${gutterX} ${midY}, ${targetGutterX} ${midY} S ${targetGutterX} ${B.midY}, ${targetX} ${B.midY}`;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'sequence-arrow');
    path.setAttribute('marker-end', 'url(#blueArrowHead)');
    svg.appendChild(path);
  };

  state.sequentialChains.forEach(chain => {
    for (let i = 0; i < chain.length - 1; i++) addArrow(chain[i], chain[i + 1]);
  });
  wrap.appendChild(svg);
}

function calculate() {
  if (!state.data.length) return;
  const p = parseP($('pattern').value);
  const nums = getNumbers();
  $('inputStats').textContent = `${nums.length} number${nums.length === 1 ? '' : 's'}`;

  if (p === null) {
    $('resultStatus').textContent = 'Please enter 0p, 1p, 2p, 3p, 4p, 5p, 6p or 7p.';
    renderOneChangeTable();
    return;
  }
  if (!nums.length) {
    state.sequentialChains = [];
    state.matches = [];
    renderOneChangeTable();
    $('matchDetails').innerHTML = '';
    $('resultStatus').textContent = 'Paste at least one 3-digit number.';
    return;
  }

  const allMatches = findAllMatches(nums);
  const matches = state.sequentialOnly ? filterSequentialMatches(allMatches, p, nums.length) : allMatches;
  if (!state.sequentialOnly) state.sequentialChains = [];

  const highlights = new Map();
  matches.forEach(match => {
    const key = `${match.col}:${match.row}`;
    if (!highlights.has(key)) highlights.set(key, match);
  });

  state.matches = matches;
  renderOneChangeTable(highlights);
  renderResults(matches, p, allMatches.length);
}

function renderResults(matches, p, allCount = matches.length) {
  if (state.sequentialOnly) {
    $('resultStatus').textContent = matches.length
      ? `${matches.length} sequential matches kept • ${allCount - matches.length} non-sequential hidden • ${p}p.`
      : `No complete sequential sequence found • ${allCount} individual matches hidden • ${p}p.`;
  } else {
    $('resultStatus').textContent = matches.length
      ? `${matches.length} individual 1-change matches found • ${p}p.`
      : `No individual 1-change matches found • ${p}p.`;
  }

  const wrap = $('matchDetails');
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

function addRow() {
  if (!state.headers.length) return;
  state.data.push(Array(state.headers.length).fill(''));
  state.rowCount = state.data.length;
  renderFixedTable();
  updateMeta('Edited working table');
  calculate();
}

function addColumn() {
  if (!state.headers.length) return;
  const index = state.headers.length;
  state.headers.push(`C${index + 1}`);
  state.data.forEach(row => row.push(''));
  renderFixedTable();
  updateMeta('Edited working table');
  calculate();
  requestAnimationFrame(() => {
    const th = $('resultTable').querySelector(`th[data-col="${index}"]`);
    if (th) th.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  });
}

$('inputNumbers').addEventListener('input', () => {
  $('inputStats').textContent = `${getNumbers().length} numbers`;
});
$('calculateBtn').addEventListener('click', calculate);
$('pattern').addEventListener('keydown', e => { if (e.key === 'Enter') calculate(); });

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
  $('inputStats').textContent = '0 numbers';
  $('matchDetails').innerHTML = '';
  state.matches = [];
  state.sequentialChains = [];
  if (state.sequentialOnly) {
    state.sequentialOnly = false;
    $('sequentialBtn').classList.remove('active');
    $('sequentialBtn').textContent = 'အစဉ်လိုက်';
  }
  renderOneChangeTable();
  $('resultStatus').textContent = state.data.length ? 'Cleared.' : 'Upload the fixed table to begin.';
});

$('addRowBtn').addEventListener('click', addRow);
$('addColumnBtn').addEventListener('click', addColumn);

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
