// 2 Same Numbers Table
// Compare each Search-bar input against every Fixed Table value.
// Digit order does not matter. A match is valid when at least 2 digits are shared.
function sharedDigitCount(a, b) {
  const A = digitCounts(a), B = digitCounts(b);
  let shared = 0;
  for (let d = 0; d <= 9; d++) shared += Math.min(A[d], B[d]);
  return shared;
}

function isTwoSameNumbers(a, b) {
  const x = normalize3(a), y = normalize3(b);
  if (!/^\d{3}$/.test(x) || !/^\d{3}$/.test(y)) return false;
  return sharedDigitCount(x, y) >= 2;
}

function findTwoSameMatches(inputs) {
  const matches = [];
  const rows = state.data.length;
  const cols = state.headers.length;
  inputs.forEach((input, inputIndex) => {
    for (let col = 0; col < cols; col++) {
      for (let row = 0; row < rows; row++) {
        const value = state.data[row]?.[col] || '';
        if (isTwoSameNumbers(input, value)) {
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

function renderTwoSameDetails(matches) {
  const wrap = $('twoSameMatchDetails');
  wrap.innerHTML = '';
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

function calculateTwoSameNumbers() {
  if (!state.data.length) return;
  const nums = getNumbers();
  if (!nums.length) {
    state.twoSameMatches = [];
    renderWorkingTable('twoSameResultTable', new Map(), 'two-same-data-table', false);
    renderTwoSameDetails([]);
    $('twoSameResultStatus').textContent = 'Paste at least one 3-digit number.';
    return;
  }

  const matches = findTwoSameMatches(nums);
  state.twoSameMatches = matches;
  renderWorkingTable('twoSameResultTable', makeHighlights(matches), 'two-same-data-table', false);
  $('twoSameResultStatus').textContent = matches.length
    ? `${matches.length} matches found • at least 2 digits same.`
    : 'No match found • at least 2 digits must be same.';
  renderTwoSameDetails(matches);
}

function setupDetailToggle() {
  state.detailsVisible = false;
  const detailIds = [
    'matchDetails','twoMatchDetails','threeMatchDetails','fourMatchDetails',
    'fiveMatchDetails','sixMatchDetails','sevenMatchDetails','eightMatchDetails',
    'nineMatchDetails','twoSameMatchDetails'
  ];
  detailIds.forEach(id => {
    const el = $(id);
    if (el) { el.classList.add('detail-table-wrap'); el.hidden = true; }
  });

  const btn = $('detailToggleBtn');
  if (!btn) return;
  btn.textContent = '👁';
  btn.title = 'Show detail tables';
  btn.setAttribute('aria-label', 'Show detail tables');
  btn.addEventListener('click', () => {
    state.detailsVisible = !state.detailsVisible;
    detailIds.forEach(id => {
      const el = $(id);
      if (el) el.hidden = !state.detailsVisible;
    });
    btn.textContent = state.detailsVisible ? '🙈' : '👁';
    btn.title = state.detailsVisible ? 'Hide detail tables' : 'Show detail tables';
    btn.setAttribute('aria-label', btn.title);
  });
}

state.twoSameMatches = state.twoSameMatches || [];
state.detailsVisible = false;

const calculateBeforeTwoSame = calculate;
calculate = function() {
  calculateBeforeTwoSame();
  calculateTwoSameNumbers();
};

const clearBeforeTwoSame = $('clearBtn').onclick;
$('clearBtn').addEventListener('click', () => {
  state.twoSameMatches = [];
  if ($('twoSameResultStatus')) $('twoSameResultStatus').textContent = state.data.length ? 'Cleared.' : 'Upload the fixed table to begin.';
  if ($('twoSameMatchDetails')) $('twoSameMatchDetails').innerHTML = '';
  if ($('twoSameResultTable')) renderWorkingTable('twoSameResultTable', new Map(), 'two-same-data-table', false);
});

setupDetailToggle();
if (state.data.length) calculateTwoSameNumbers();
