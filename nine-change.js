// Nine Change Table
// Exactly two digits are shared; one unmatched digit changes by +9 or -9 on the circular 0-9 wheel.
function isNineChange(a,b){
  const x=normalize3(a),y=normalize3(b); if(!/^\d{3}$/.test(x)||!/^\d{3}$/.test(y))return false;
  const A=digitCounts(x),B=digitCounts(y); let shared=0;
  for(let d=0;d<=9;d++)shared+=Math.min(A[d],B[d]); if(shared!==2)return false;
  let from=-1,to=-1; for(let d=0;d<=9;d++){if(A[d]>B[d])from=d;if(B[d]>A[d])to=d;}
  if(from<0||to<0)return false; const diff=Math.abs(from-to); return diff===1||diff===9;
}
function calculateNineChange(){
  if(!state.data.length)return; const p=parseP($('pattern').value),nums=getNumbers();
  if(p===null){$('nineResultStatus').textContent='Please enter 0p–7p.';state.nineChains=[];renderWorkingTable('nineResultTable',new Map(),'nine-change-data-table',true);$('nineMatchDetails').innerHTML='';return;}
  if(!nums.length){state.nineMatches=[];state.nineChains=[];renderWorkingTable('nineResultTable',new Map(),'nine-change-data-table',true);$('nineMatchDetails').innerHTML='';$('nineResultStatus').textContent='Paste at least one 3-digit number.';return;}
  const matcher=window.isNineChange||isNineChange;
  const all=findAllMatches(nums,matcher); const matches=state.sequentialOnly?filterSequentialMatches(all,p,nums.length,state.nineChains):all;
  if(!state.sequentialOnly)state.nineChains=[]; state.nineMatches=matches;
  renderWorkingTable('nineResultTable',makeHighlights(matches),'nine-change-data-table',true);
  setStatus('nineResultStatus',matches,all.length,p,'9-change',state.nineChains); renderDetails('nineMatchDetails',matches);
}
const previousCalculateNine=calculate; calculate=function(){previousCalculateNine();calculateNineChange();};
const previousUpdateMetaNine=updateMeta; updateMeta=function(sourceName='Edited working table'){previousUpdateMetaNine(sourceName);if($('nineChangeMeta'))$('nineChangeMeta').textContent=`${state.data.length} rows × ${state.headers.length} columns`;};
state.nineMatches=state.nineMatches||[];state.nineChains=state.nineChains||[];
$('clearBtn').addEventListener('click',()=>{state.nineMatches=[];state.nineChains=[];$('nineResultStatus').textContent=state.data.length?'Cleared.':'Upload the fixed table to begin.';$('nineMatchDetails').innerHTML='';renderWorkingTable('nineResultTable',new Map(),'nine-change-data-table',true);});
if(state.data.length)calculateNineChange();
