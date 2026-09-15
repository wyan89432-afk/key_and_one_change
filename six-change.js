// Six Change Table
// Rule: digit order does not matter. Exactly TWO digits are shared;
// the ONE unmatched digit changes by +6 or -6 on the circular 0-9 wheel.
function isSixChange(a, b) {
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
  return diff === 4 || diff === 6;
}

function renderSixTable(highlights) {
  const wrap = $('sixResultTable');
  wrap.innerHTML = '';
  if (!state.headers.length) return;
  const table = document.createElement('table');
  table.className = 'data-table six-change-data-table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  const rowHead = document.createElement('th'); rowHead.textContent='0'; rowHead.className='row-index-head'; hr.appendChild(rowHead);
  state.headers.forEach((h,c)=>{ const th=document.createElement('th'); th.textContent=h||`C${c+1}`; th.dataset.col=c; makeWorkingHeaderEditable(th,c); hr.appendChild(th); });
  thead.appendChild(hr); table.appendChild(thead);
  const tbody=document.createElement('tbody');
  state.data.forEach((row,r)=>{ const tr=document.createElement('tr'); const indexTd=document.createElement('td'); indexTd.textContent=r+1; indexTd.className='row-index'; tr.appendChild(indexTd);
    row.forEach((v,c)=>{ const td=document.createElement('td'); td.textContent=v; td.dataset.row=r; td.dataset.col=c; const hit=highlights.get(`${c}:${r}`); if(hit){td.classList.add(`hit-${hit.color}`);td.title=`${hit.input} → ${v} • row ${r+1}, column ${state.headers[c]}`;} makeWorkingCellEditable(td,r,c); tr.appendChild(td); }); tbody.appendChild(tr); });
  table.appendChild(tbody); wrap.appendChild(table); if(state.sequentialOnly) requestAnimationFrame(drawSixSequentialArrows);
}

function drawSixSequentialArrows() {
  const wrap=$('sixResultTable'); const old=wrap.querySelector('.arrow-layer'); if(old) old.remove(); if(!state.sequentialOnly||!state.sixChains?.length)return;
  const table=wrap.querySelector('.six-change-data-table'); if(!table)return;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.classList.add('arrow-layer'); svg.setAttribute('width',table.offsetWidth); svg.setAttribute('height',table.offsetHeight); svg.setAttribute('viewBox',`0 0 ${table.offsetWidth} ${table.offsetHeight}`); svg.setAttribute('aria-hidden','true');
  const defs=document.createElementNS('http://www.w3.org/2000/svg','defs'); const marker=document.createElementNS('http://www.w3.org/2000/svg','marker'); marker.setAttribute('id','six-blueArrowHead'); marker.setAttribute('markerWidth','8'); marker.setAttribute('markerHeight','8'); marker.setAttribute('refX','7'); marker.setAttribute('refY','4'); marker.setAttribute('orient','auto'); const head=document.createElementNS('http://www.w3.org/2000/svg','path'); head.setAttribute('d','M0,0 L8,4 L0,8 Z'); head.setAttribute('fill','#1683ff'); marker.appendChild(head); defs.appendChild(marker); svg.appendChild(defs);
  const point=m=>table.querySelector(`td[data-row="${m.row}"][data-col="${m.col}"]`); const rect=el=>{const r=el.getBoundingClientRect(),wr=wrap.getBoundingClientRect();return{left:r.left-wr.left+wrap.scrollLeft,right:r.right-wr.left+wrap.scrollLeft,midY:(r.top+r.bottom)/2-wr.top+wrap.scrollTop};};
  state.sixChains.forEach(chain=>{for(let i=0;i<chain.length-1;i++){const ca=point(chain[i]),cb=point(chain[i+1]);if(!ca||!cb)continue;const A=rect(ca),B=rect(cb);let d;if(chain[i].col===chain[i+1].col){const x=Math.max(A.right,B.right)+12;d=`M ${A.right+2} ${A.midY} C ${x} ${A.midY}, ${x} ${B.midY}, ${B.right+2} ${B.midY}`;}else{const rightward=chain[i+1].col>chain[i].col,sourceX=rightward?A.right+2:A.left-2,gutterX=rightward?A.right+8:A.left-8,targetGutterX=rightward?B.left-8:B.right+8,targetX=rightward?B.left-2:B.right+2,midY=(A.midY+B.midY)/2;d=`M ${sourceX} ${A.midY} C ${gutterX} ${A.midY}, ${gutterX} ${midY}, ${targetGutterX} ${midY} S ${targetGutterX} ${B.midY}, ${targetX} ${B.midY}`;}const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('class','sequence-arrow');path.setAttribute('marker-end','url(#six-blueArrowHead)');svg.appendChild(path);}}); wrap.appendChild(svg);
}

function calculateSixChange(){
  if(!state.data.length)return; const p=parseP($('pattern').value); const nums=getNumbers();
  if(p===null){$('sixResultStatus').textContent='Please enter 0p, 1p, 2p, 3p, 4p, 5p, 6p or 7p.';state.sixChains=[];renderSixTable(new Map());$('sixMatchDetails').innerHTML='';return;}
  if(!nums.length){state.sixMatches=[];state.sixChains=[];renderSixTable(new Map());$('sixMatchDetails').innerHTML='';$('sixResultStatus').textContent='Paste at least one 3-digit number.';return;}
  const allSix=findAllMatches(nums,isSixChange); const sixMatches=state.sequentialOnly?filterSequentialMatches(allSix,p,nums.length,state.sixChains):allSix; if(!state.sequentialOnly)state.sixChains=[]; state.sixMatches=sixMatches; renderSixTable(makeHighlights(sixMatches)); setStatus('sixResultStatus',sixMatches,allSix.length,p,'6-change',state.sixChains); renderDetails('sixMatchDetails',sixMatches);
}

const previousCalculateSix=calculate; calculate=function(){previousCalculateSix();calculateSixChange();};
const previousUpdateMetaSix=updateMeta; updateMeta=function(sourceName='Edited working table'){previousUpdateMetaSix(sourceName);if($('sixChangeMeta'))$('sixChangeMeta').textContent=`${state.data.length} rows × ${state.headers.length} columns`;};
state.sixMatches=state.sixMatches||[];state.sixChains=state.sixChains||[];
$('clearBtn').addEventListener('click',()=>{state.sixMatches=[];state.sixChains=[];if($('sixMatchDetails'))$('sixMatchDetails').innerHTML='';if($('sixResultStatus'))$('sixResultStatus').textContent=state.data.length?'Cleared.':'Upload the fixed table to begin.';renderSixTable(new Map());});
if(state.data.length)calculateSixChange();
