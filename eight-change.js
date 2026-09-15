// Eight Change Table
// Exactly two digits are shared; one unmatched digit changes by +8 or -8 on the circular 0-9 wheel.
function isEightChange(a,b){
  const x=normalize3(a),y=normalize3(b); if(!/^\d{3}$/.test(x)||!/^\d{3}$/.test(y))return false;
  const A=digitCounts(x),B=digitCounts(y); let shared=0;
  for(let d=0;d<=9;d++)shared+=Math.min(A[d],B[d]); if(shared!==2)return false;
  let from=-1,to=-1; for(let d=0;d<=9;d++){if(A[d]>B[d])from=d;if(B[d]>A[d])to=d;}
  if(from<0||to<0)return false; const diff=Math.abs(from-to); return diff===2||diff===8;
}
function calculateEightChange(){
  if(!state.data.length)return; const p=parseP($('pattern').value),nums=getNumbers();
  if(p===null){$('eightResultStatus').textContent='Please enter 0p–7p.';state.eightChains=[];renderWorkingTable('eightResultTable',new Map(),'eight-change-data-table',true);$('eightMatchDetails').innerHTML='';return;}
  if(!nums.length){state.eightMatches=[];state.eightChains=[];renderWorkingTable('eightResultTable',new Map(),'eight-change-data-table',true);$('eightMatchDetails').innerHTML='';$('eightResultStatus').textContent='Paste at least one 3-digit number.';return;}
  const all=findAllMatches(nums,isEightChange); const matches=state.sequentialOnly?filterSequentialMatches(all,p,nums.length,state.eightChains):all;
  if(!state.sequentialOnly)state.eightChains=[]; state.eightMatches=matches;
  renderWorkingTable('eightResultTable',makeHighlights(matches),'eight-change-data-table',true);
  setStatus('eightResultStatus',matches,all.length,p,'8-change',state.eightChains); renderDetails('eightMatchDetails',matches);
}
const previousCalculateEight=calculate; calculate=function(){previousCalculateEight();calculateEightChange();};
const previousUpdateMetaEight=updateMeta; updateMeta=function(sourceName='Edited working table'){previousUpdateMetaEight(sourceName);if($('eightChangeMeta'))$('eightChangeMeta').textContent=`${state.data.length} rows × ${state.headers.length} columns`;};
state.eightMatches=state.eightMatches||[];state.eightChains=state.eightChains||[];
$('clearBtn').addEventListener('click',()=>{state.eightMatches=[];state.eightChains=[];$('eightResultStatus').textContent=state.data.length?'Cleared.':'Upload the fixed table to begin.';$('eightMatchDetails').innerHTML='';renderWorkingTable('eightResultTable',new Map(),'eight-change-data-table',true);});
if(state.data.length)calculateEightChange();
