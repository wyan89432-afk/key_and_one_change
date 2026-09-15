// Seven Change Table
// Rule: digit order does not matter. Exactly TWO digits are shared;
// the ONE unmatched digit changes by +7 or -7 on the circular 0-9 wheel.
function isSevenChange(a, b) {
  const x = normalize3(a), y = normalize3(b);
  if (!/^\d{3}$/.test(x) || !/^\d{3}$/.test(y)) return false;
  const A = digitCounts(x), B = digitCounts(y);
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
  return diff === 3 || diff === 7;
}

function renderSevenTable(matches) {
  const el = document.getElementById('sevenResultTable');
  if (!el) return;
  if (!matches.length) { el.innerHTML = ''; return; }
  const grouped = {};
  matches.forEach(m => {
    const key = `${m.row}-${m.col}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });
  el.innerHTML = matches.map(m => `<span class="match-chip color-${m.color}" data-linear="${m.linear}">${m.value}</span>`).join(' ');
}

function drawSevenSequentialArrows(matches) {
  const el = document.getElementById('sevenResultTable');
  if (!el) return;
  el.querySelectorAll('.seven-arrow').forEach(x => x.remove());
  if (!matches || matches.length < 2) return;
  for (let i = 1; i < matches.length; i++) {
    const from = el.querySelector(`[data-linear="${matches[i - 1].linear}"]`);
    const to = el.querySelector(`[data-linear="${matches[i].linear}"]`);
    if (!from || !to) continue;
    const arrow = document.createElement('span');
    arrow.className = 'seven-arrow';
    arrow.textContent = '→';
    from.insertAdjacentElement('afterend', arrow);
  }
}

function calculateSevenChange() {
  if (!state.data || !state.data.length) return;
  const inputs = getNumbers();
  const p = parseP(document.getElementById('pattern')?.value || '0p');
  let matches = findAllMatches(inputs, isSevenChange);
  if (state.sequentialOnly) {
    state.sevenChains = [];
    matches = filterSequentialMatches(matches, p, inputs.length, state.sevenChains);
  }
  matches.forEach((m, i) => { m.color = ['yellow','green','red','blue','brown'][i % 5]; });
  state.sevenMatches = matches;
  renderSevenTable(matches);
  drawSevenSequentialArrows(matches);
  const status = document.getElementById('sevenResultStatus');
  const meta = document.getElementById('sevenChangeMeta');
  if (status) setStatus(status, `${matches.length} match${matches.length === 1 ? '' : 'es'}`);
  if (meta) meta.textContent = `${inputs.length} input • ${matches.length} matches`;
  const details = document.getElementById('sevenMatchDetails');
  if (details) renderDetails(details, matches);
}

const previousCalculateForSeven = window.calculate;
window.calculate = function() {
  if (previousCalculateForSeven) previousCalculateForSeven();
  calculateSevenChange();
};

const previousUpdateMetaForSeven = window.updateMeta;
window.updateMeta = function() {
  if (previousUpdateMetaForSeven) previousUpdateMetaForSeven();
  const meta = document.getElementById('sevenChangeMeta');
  if (meta) meta.textContent = state.data?.length ? `${getNumbers().length} input • ${(state.sevenMatches || []).length} matches` : 'No table loaded';
};

document.getElementById('clearBtn')?.addEventListener('click', () => {
  state.sevenMatches = [];
  state.sevenChains = [];
  const table = document.getElementById('sevenResultTable');
  const details = document.getElementById('sevenMatchDetails');
  if (table) table.innerHTML = '';
  if (details) details.innerHTML = '';
});

document.addEventListener('DOMContentLoaded', () => calculateSevenChange());
