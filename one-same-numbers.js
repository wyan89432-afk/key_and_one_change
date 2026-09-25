// 1 Same Numbers Table
// Compare each Search-bar input against every Fixed Table value.
// Digit order does not matter. A match is valid when exactly 1 digit is shared.
function isOneSameNumbers(a, b) {
  const x = normalize3(a), y = normalize3(b);
  if (!/^\d{3}$/.test(x) || !/^\d{3}$/.test(y)) return false;
  return sharedDigitCount(x, y) === 1;
}

const ONE_SAME_COLORS = ['yellow', 'green', 'red', 'blue'];

function findOneSameMatches(inputs) {
  const matches = [];
  const rows = state.data.length;
  const cols = state.headers.length;
  inputs.forEach((input, inputIndex) => {
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const value = state.data[row]?.[col] || '';
        if (isOneSameNumbers(input, value)) {
          matches.push({
            linear: col * rows + row,
            row,
            col,
            value,
            input,
            index: inputIndex + 1,
            color: ONE_SAME_COLORS[inputIndex % ONE_SAME_COLORS.length]
          });
        }
      }
    }
  });
  return matches;
}

// Sequential mode for 1 Same:
// Each pasted input must have one or more 1-Same matches somewhere in the
// next consecutive Fixed Table row. Column does not have to be the same.
// The first input can start at any table row; the full input list must occupy
// consecutive rows. All matching cells in those rows are highlighted.
function filterOneSameSequentialMatches(inputs, chainStore) {
  chainStore.length = 0;
  if (!inputs.length || !state.data.length) return [];

  const rows = state.data.length;
  const cols = state.headers.length;
  const rowGroups = [];

  for (let inputIndex = 0; inputIndex < inputs.length; inputIndex++) {
    const input = inputs[inputIndex];
    const group = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const value = state.data[row]?.[col] || '';
        if (isOneSameNumbers(input, value)) {
          group.push({
            linear: col * rows + row,
            row,
            col,
            value,
            input,
            index: inputIndex + 1,
            color: ONE_SAME_COLORS[inputIndex % ONE_SAME_COLORS.length]
          });
        }
      }
    }
    rowGroups.push(group);
  }

  for (let startRow = 0; startRow <= rows - inputs.length; startRow++) {
    const chain = [];
    let complete = true;

    for (let i = 0; i < inputs.length; i++) {
      const targetRow = startRow + i;
      const rowMatches = rowGroups[i].filter(m => m.row === targetRow);
      if (!rowMatches.length) {
        complete = false;
        break;
      }
      chain.push(...rowMatches);
    }

    if (complete) {
      chainStore.push(chain);
    }
  }

  const unique = new Map();
  chainStore.forEach(chain => chain.forEach(m => {
    const key = `${m.col}:${m.row}:${m.index}`;
    if (!unique.has(key)) unique.set(key, m);
  }));
  return Array.from(unique.values()).sort((a, b) => a.row - b.row || a.col - b.col || a.index - b.index);
}

function colorLabelOneSame(color) {
  return ({
    yellow: '🟡 Yellow',
    green: '💚 Green',
    red: '❤️ Red',
    blue: '🔵 Blue'
  })[color] || color;
}

function renderOneSameDetails(matches) {
  const wrap = $('oneSameMatchDetails');
  if (!wrap) return;
  wrap.innerHTML = '';
  wrap.classList.add('detail-table-wrap');
  wrap.hidden = !state.detailsVisible;
  if (!matches.length) return;

  const table = document.createElement('table');
  table.className = 'result-table';
  table.innerHTML = '<thead><tr><th>#</th><th>Input</th><th>Matched</th><th>Column</th></tr></thead>';
  const body = document.createElement('tbody');
  matches.forEach(m => {
    const tr = document.createElement('tr');
    [m.index, m.input, m.value, state.headers[m.col]].forEach(v => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
  table.appendChild(body);
  wrap.appendChild(table);
}

function renderOneSameSequentialReport(chains) {
  const wrap = $('oneSameMatchDetails');
  if (!wrap) return;
  wrap.innerHTML = '';
  wrap.classList.add('detail-table-wrap');
  wrap.hidden = !state.sequentialOnly;

  const heading = document.createElement('h3');
  heading.textContent = 'အစဉ်လိုက် Report';
  wrap.appendChild(heading);

  if (!state.sequentialOnly) return;
  if (!chains.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Complete sequential 7-row match မတွေ့ပါ။';
    wrap.appendChild(p);
    return;
  }

  const table = document.createElement('table');
  table.className = 'result-table';
  table.innerHTML = '<thead><tr><th>Group</th><th>Color</th><th>Rows</th><th>Numbers</th></tr></thead>';
  const body = document.createElement('tbody');

  chains.forEach((chain, chainIndex) => {
    const tr = document.createElement('tr');
    const rowRange = chain.length ? [...new Set(chain.map(m => m.row + 1))].sort((a, b) => a - b) : [];
    const numbers = chain.map(m => m.value);
    const color = chain[0]?.color || 'yellow';
    [
      chainIndex + 1,
      colorLabelOneSame(color),
      rowRange.join(' → '),
      numbers.join(' → ')
    ].forEach(v => {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });
  table.appendChild(body);
  wrap.appendChild(table);
}

function calculateOneSameNumbers() {
  if (!state.data.length) return;
  const nums = getNumbers();
  if (!nums.length) {
    state.oneSameMatches = [];
    state.oneSameChains = [];
    renderWorkingTable('oneSameResultTable', new Map(), 'one-same-data-table', false);
    renderOneSameDetails([]);
    $('oneSameResultStatus').textContent = 'Paste at least one 3-digit number.';
    return;
  }

  const allMatches = findOneSameMatches(nums);
  const chains = [];
  const matches = state.sequentialOnly
    ? filterOneSameSequentialMatches(nums, chains)
    : allMatches;

  state.oneSameMatches = matches;
  state.oneSameChains = chains;
  renderWorkingTable('oneSameResultTable', makeHighlights(matches), 'one-same-data-table', false);
  $('oneSameResultStatus').textContent = state.sequentialOnly
    ? (chains.length ? `${chains.length} complete 7-row sequential group(s) found.` : 'No complete 7-row sequential group found.')
    : (matches.length ? `${matches.length} matches found • exactly 1 digit same.` : 'No match found • exactly 1 digit must be same.');

  if (state.sequentialOnly) renderOneSameSequentialReport(chains);
  else renderOneSameDetails(matches);
}

state.oneSameMatches = state.oneSameMatches || [];
state.oneSameChains = state.oneSameChains || [];

const calculateBeforeOneSame = calculate;
calculate = function() {
  calculateBeforeOneSame();
  calculateOneSameNumbers();
};

$('clearBtn').addEventListener('click', () => {
  state.oneSameMatches = [];
  state.oneSameChains = [];
  if ($('oneSameResultStatus')) $('oneSameResultStatus').textContent = state.data.length ? 'Cleared.' : 'Upload the fixed table to begin.';
  if ($('oneSameMatchDetails')) $('oneSameMatchDetails').innerHTML = '';
  if ($('oneSameResultTable')) renderWorkingTable('oneSameResultTable', new Map(), 'one-same-data-table', false);
});

if (state.data.length) calculateOneSameNumbers();
