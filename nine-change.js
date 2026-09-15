function isNineChange(a,b){
  const x=normalize3(a),y=normalize3(b);
  if(!/^\d{3}$/.test(x)||!/^\d{3}$/.test(y))return false;
  const A=digitCounts(x),B=digitCounts(y);
  let shared=0;
  for(let d=0;d<=9;d++)shared+=Math.min(A[d],B[d]);
  if(shared!==2)return false;
  let from=-1,to=-1;
  for(let d=0;d<=9;d++){
    if(A[d]>B[d])from=d;
    if(B[d]>A[d])to=d;
  }
  if(from<0||to<0)return false;
  const diff=Math.abs(from-to);
  return diff===1||diff===9;
}

function renderNineTable(matches){
  const table=document.getElementById('nineChangeTable');
  if(!table)return;
  const rows=state.rowCount||24;
  table.innerHTML='';
  const byLinear=new Map(matches.map(m=>[m.linear,m]));
  for(let r=0;r<rows;r++){
    const tr=document.createElement('tr');
    for(let c=0;c<state.headers.length;c++){
      const td=document.createElement('td');
      const linear=c*rows+r;
      const m=byLinear.get(linear);
      td.textContent=state.data[r]?.[c]??'';
      if(m)td.classList.add('nine-match',m.color||'yellow');
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function drawNineSequentialArrows(chains){
  const host=document.getElementById('nineArrowLayer');
  if(!host)return;
  host.innerHTML='';
  for(const chain of chains||[]){
    for(let i=0;i<chain.length-1;i++){
      const a=chain[i],b=chain[i+1];
      const arrow=document.createElement('div');
      arrow.className='nine-seq-arrow';
      arrow.title=`${a.value} → ${b.value}`;
      host.appendChild(arrow);
    }
  }
}

function calculateNineChange(){
  const inputs=getNumbers();
  const p=parseP();
  if(!inputs.length){
    state.nineMatches=[];state.nineChains=[];
    renderNineTable([]);drawNineSequentialArrows([]);return;
  }
  let matches=findAllMatches(inputs,isNineChange);
  let chains=[];
  if(state.sequentialOnly){
    matches=filterSequentialMatches(matches,p,inputs.length,chains);
  }
  state.nineMatches=matches;state.nineChains=chains;
  renderNineTable(matches);
  drawNineSequentialArrows(chains);
  if(typeof updateMeta==='function')updateMeta();
}

const previousCalculateNine=window.calculate;
window.calculate=function(){
  if(typeof previousCalculateNine==='function')previousCalculateNine();
  calculateNineChange();
};

const previousUpdateMetaNine=window.updateMeta;
window.updateMeta=function(){
  if(typeof previousUpdateMetaNine==='function')previousUpdateMetaNine();
  const el=document.getElementById('nineMeta');
  if(el)el.textContent=`Nine Change: ${(state.nineMatches||[]).length} matches`;
};

document.addEventListener('DOMContentLoaded',()=>{
  const clear=document.getElementById('clearBtn');
  if(clear)clear.addEventListener('click',()=>{
    state.nineMatches=[];state.nineChains=[];
    renderNineTable([]);drawNineSequentialArrows([]);
  });
  calculateNineChange();
});
