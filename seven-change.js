// Seven Change Table
// Exactly two digits are shared; one unmatched digit changes by +7 or -7 on the circular 0-9 wheel.
function isSevenChange(a,b){
  const x=normalize3(a),y=normalize3(b); if(!/^\d{3}$/.test(x)||!/^\d{3}$/.test(y))return false;
  const A=digitCounts(x),B=digitCounts(y); let shared=0;
  for(let d=0;d<=9;d++)shared+=Math.min(A[d],B[d]); if(shared!==2)return false;
  let from=-1,to=-1; for(let d=0;d<=9;d++){if(A[d]>B[d])from=d;if(B[d]>A[d])to=d;}
  if(from<0||to<0)return false; const diff=Math.abs(from-to); return diff===3||diff===7;
}
function calculateSevenChange(){
  if(!state.data.length)return; const p=parseP($('pattern').value),nums=getNumbers();
  if(p===null){$('sevenResultStatus').textContent='Please enter 0p–7p.';state.sevenChains=[];renderWorkingTable('sevenResultTable',new Map(),'seven-change-data-table',true);$('sevenMatchDetails').innerHTML='';return;}
  if(!nums.length){state.sevenMatches=[];state.sevenChains=[];renderWorkingTable('sevenResultTable',new Map(),'seven-change-data-table',true);$('sevenMatchDetails').innerHTML='';$('sevenResultStatus').textContent='Paste at least one 3-digit number.';return;}
  const all=findAllMatches(nums,isSevenChange); const matches=state.sequentialOnly?filterSequentialMatches(all,p,nums.length,state.sevenChains):all;
  if(!state.sequentialOnly)state.sevenChains=[]; state.sevenMatches=matches;
  renderWorkingTable('sevenResultTable',makeHighlights(matches),'seven-change-data-table',true);
  setStatus('sevenResultStatus',matches,all.length,p,'7-change',state.sevenChains); renderDetails('sevenMatchDetails',matches);
}
const previousCalculateSeven=calculate; calculate=function(){previousCalculateSeven();calculateSevenChange();};
const previousUpdateMetaSeven=updateMeta; updateMeta=function(sourceName='Edited working table'){previousUpdateMetaSeven(sourceName);if($('sevenChangeMeta'))$('sevenChangeMeta').textContent=`${state.data.length} rows × ${state.headers.length} columns`;};
state.sevenMatches=state.sevenMatches||[];state.sevenChains=state.sevenChains||[];
$('clearBtn').addEventListener('click',()=>{state.sevenMatches=[];state.sevenChains=[];$('sevenResultStatus').textContent=state.data.length?'Cleared.':'Upload the fixed table to begin.';$('sevenMatchDetails').innerHTML='';renderWorkingTable('sevenResultTable',new Map(),'seven-change-data-table',true);});
if(state.data.length)calculateSevenChange();
