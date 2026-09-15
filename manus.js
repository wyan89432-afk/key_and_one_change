// Manus subtraction modes for all Change tables.
// Mode 3 is the default automatic mode.
const manusState = {
  mode: 'third'
};

function manusSubtractDigit(digit, change) {
  return (digit - change + 10) % 10;
}

function manusTargetCounts(source, change, mode) {
  const x = normalize3(source);
  if (!/^\d{3}$/.test(x)) return [];
  const digits = x.split('').map(Number);
  const targets = [];

  digits.forEach((d, index) => {
    let target = null;
    if (mode === 'first') {
      target = manusSubtractDigit(d, change);
    } else if (mode === 'second') {
      if (d < change) target = change - d;
    } else {
      if (d > change) target = d - change;
    }
    if (target !== null) targets.push({ index, from: d, to: target });
  });
  return targets;
}

function sameTwoDigitsExcept(source, target, changedIndex, targetDigit) {
  const a = normalize3(source), b = normalize3(target);
  if (!/^\d{3}$/.test(a) || !/^\d{3}$/.test(b)) return false;
  const remainingA = [];
  const remainingB = [];
  for (let i = 0; i < 3; i++) {
    if (i === changedIndex) continue;
    remainingA.push(a[i]);
    remainingB.push(b[i]);
  }
  remainingA.sort();
  remainingB.sort();
  return remainingA.join('') === remainingB.join('') && Number(b[changedIndex]) === targetDigit;
}

function manusMinusChange(a, b, change) {
  const targets = manusTargetCounts(a, change, manusState.mode);
  return targets.some(item => sameTwoDigitsExcept(a, b, item.index, item.to));
}

function normalPlusChange(a, b, change) {
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
  return (to - from + 10) % 10 === change;
}

function isManusChange(a, b, change) {
  return normalPlusChange(a, b, change) || manusMinusChange(a, b, change);
}

function setManusMode(mode) {
  manusState.mode = mode;
  document.querySelectorAll('.manus-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.manusMode === mode);
  });
  if (typeof calculate === 'function') calculate();
}

function initManusButtons() {
  document.querySelectorAll('.manus-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const requested = btn.dataset.manusMode;
      setManusMode(manusState.mode === requested ? 'third' : requested);
    });
  });
  document.querySelectorAll('.manus-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.manusMode === manusState.mode);
  });
}

document.addEventListener('DOMContentLoaded', initManusButtons);
