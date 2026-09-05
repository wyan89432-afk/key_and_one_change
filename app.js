const state = { headers: [], data: [], matches: [], sequentialOnly: false, sequentialChains: [] };
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

// 1-change rule: digit order does not matter. Exactly two digits are shared,
// and the remaining digit changes by +/-1. Digits are circular: 0 <-> 9.
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

  let from = -1, to = -1;
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
  state.sequentialChains = [];
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
      td.dataset.row = r;
      td.dataset.col = c;
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

// In sequential mode, follow the table's column-major order. Start with input
// #1 (yellow), then find input #2 (green) after it. If the current column ends,
// the search naturally continues at the first row of the next column. Continue
// through all pasted inputs. Only chains with at least two ordered matches stay.
function filterSequentialMatches(matches) {
  state.sequentialChains = [];
  if (!matches.length) return [];

  const byIndex = new Map();
  matches.forEach(m => {
    if (!byIndex.has(m.index)) byIndex.set(m.index, []);
    byIndex.get(m.index).push(m);
  });
  byIndex.forEach(list => list.sort((a, b) => a.linear - b.linear || a.col - b.col || a.row - b.row));

  const starts = byIndex.get(1) || [];
  for (const start of starts) {
    const chain = [start];
    let previous = start.linear;
    let wanted = 2;

    while (byIndex.has(wanted)) {
      const next = byIndex.get(wanted).find(m => m.linear > previous);
      if (!next) break;
      chain.push(next);
      previous = next.linear;
      wanted++;
    }

    if (chain.length >= 2) state.sequentialChains.push(chain);
  }

  const unique = new Map();
  state.sequentialChains.forEach(chain => chain.forEach(m => {
    const key = `${m.col}:${m.row}:${m.index}`;
    if (!unique.has(key)) unique.set(key, m);
  }));

  return Array.from(unique.values()).sort((a, b) => a.linear - b.linear || a.index - b.index);
}

function drawSequentialArrows() {
  const wrap = $('fixedTable');
  const old = wrap.querySelector('.arrow-layer');
  if (old) old.remove();
  if (!state.sequentialOnly || !state.sequentialChains.length) return;

  const table = wrap.querySelector('.data-table');
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
    const r = el.getBoundingClientRect();
    const wr = wrap.getBoundingClientRect();
    return { left: r.left - wr.left + wrap.scrollLeft, right: r.right - wr.left + wrap.scrollLeft, top: r.top - wr.top + wrap.scrollTop, bottom: r.bottom - wr.top + wrap.scrollTop, midY: (r.top + r.bottom) / 2 - wr.top + wrap.scrollTop };
  };

  const addArrow = (a, b) => {
    const ca = point(a), cb = point(b);
    if (!ca || !cb) return;
    const A = rect(ca), B = rect(cb);
    const sameColumn = a.col === b.col;
    let x1, y1, x2, y2, d;

    if (sameColumn) {
      const side = Math.min(table.offsetWidth - 6, Math.max(A.right, B.right) + 13);
      x1 = A.right + 2; y1 = A.midY;
      x2 = B.right + 2; y2 = B.midY;
      const bend = side;
      d = `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`;
    } else {
      x1 = A.right + 2; y1 = A.midY;
      x2 = B.left - 2; y2 = B.midY;
      const dx = Math.max(24, Math.abs(x2 - x1) * 0.45);
      d = `M ${x1} ${y1} C ${x1 + dx} ${y1 - 18}, ${x2 - dx} ${y2 + 18}, ${x2} ${y2}`;
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
    return;
  }
  if (!nums.length) {
    $('resultStatus').textContent = 'Paste at least one 3-digit number.';
    state.sequentialChains = [];
    renderFixedTable();
    $('resultTable').innerHTML = '';
    return;
  }

  const allMatches = findAllMatches(nums);
  const matches = state.sequentialOnly ? filterSequentialMatches(allMatches) : allMatches;
  if (!state.sequentialOnly) state.sequentialChains = [];

  const highlights = new Map();
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
  $('resultTable').innerHTML = '';
  $('inputStats').textContent = '0 numbers';
  state.sequentialChains = [];
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
