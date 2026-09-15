// 2 Same Numbers: a 3-digit number is valid when exactly two digits are the same.
function isTwoSameNumber(value){
  const x=normalize3(value);
  if(!/^\d{3}$/.test(x))return false;
  return new Set(x.split('')).size===2;
}

function renderTwoSameReport(groups){
  const wrap=document.getElementById('twoSameReport');
  if(!wrap)return;
  wrap.innerHTML='';
  if(!groups.length){
    wrap.innerHTML='<div class="status">No 2 Same Number group found.</div>';
    return;
  }
  const table=document.createElement('table');
  table.className='data-table';
  const thead=document.createElement('thead');
  const hr=document.createElement('tr');
  ['Group','Paste #','Pasted Number','Matched Number','Row','Column'].forEach(h=>{
    const th=document.createElement('th');th.textContent=h;hr.appendChild(th);
  });
  thead.appendChild(hr);table.appendChild(thead);
  const tbody=document.createElement('tbody');
  groups.forEach((chain,gi)=>{
    chain.forEach(m=>{
      const tr=document.createElement('tr');
      [gi+1,m.index,m.input,m.value,m.row+1,state.headers[m.col]??m.col+1].forEach((v,i)=>{
        const td=document.createElement('td');td.textContent=v;
        if(i===0)td.classList.add('hit-blue');
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  });
  table.appendChild(tbody);wrap.appendChild(table);
}

function calculateTwoSameNumbers(){
  const inputs=getNumbers();
  const p=parseP();
  const matches=findAllMatches(inputs,isTwoSameNumber);
  let groups=[];
  if(state.sequentialOnly && inputs.length){
    filterSequentialMatches(matches,p,inputs.length,groups);
  }else if(!state.sequentialOnly){
    const byInput=new Map();
    matches.forEach(m=>{
      if(!byInput.has(m.index))byInput.set(m.index,[]);
      byInput.get(m.index).push(m);
    });
    groups=Array.from(byInput.values());
  }
  state.twoSameMatches=matches;
  state.twoSameGroups=groups;
  renderTwoSameReport(groups);
  const meta=document.getElementById('twoSameMeta');
  if(meta)meta.textContent=state.sequentialOnly?`${groups.length} groups`:`${matches.length} matches`;
}

const previousCalculateTwoSame=window.calculate;
window.calculate=function(){
  if(typeof previousCalculateTwoSame==='function')previousCalculateTwoSame();
  calculateTwoSameNumbers();
};

document.addEventListener('DOMContentLoaded',()=>{
  const clear=document.getElementById('clearBtn');
  if(clear)clear.addEventListener('click',()=>{
    state.twoSameMatches=[];state.twoSameGroups=[];renderTwoSameReport([]);
  });
  calculateTwoSameNumbers();
});
