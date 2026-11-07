(() => {
 if(!window.BD_CLOUD_READY)return;
 let loaded=false,writing=false,loading=false,generation=0,state='loading';
 const ready=()=>loaded&&state==='ready';
 // Never label a browser's old workspace total as the current D1 total.
 window.BD_EXPENSE_TOTAL_TEXT=()=>ready()?money(db.expenses.reduce((sum,row)=>sum+Number(row.amount||0),0)):state==='local'?null:state==='unavailable'?'Unavailable':'Loading…';
 const previousBasic=basicPage,previousReport=reportPage;
 const status=()=>'<div class="notice" role="status">'+(state==='unavailable'?'Expenses could not be loaded. Reconnect and refresh to retry.':'Loading saved expenses…')+'</div>';
 basicPage=function(key){return key==='expenses'&&!ready()&&state!=='local'?status():previousBasic(key)};
 reportPage=function(...args){return page==='report-profit'&&!ready()&&state!=='local'?status():previousReport.apply(this,args)};
 window.BD_REFRESH_EXPENSES=async function(initial=false){
  if(loading||writing||(!initial&&(!canRefreshCloudRecords()||navigator.onLine===false||window.BD_OFFLINE_SESSION)))return false;
  const started=generation,before=JSON.stringify(db.expenses);loading=true;
  try{
   const response=await fetch('/api/expenses',{cache:'no-store'}),result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw Error('Expenses could not be loaded.');
   if(started!==generation||writing||JSON.stringify(db.expenses)!==before||(!initial&&!canRefreshCloudRecords()))return false;
   const changed=!loaded||state!=='ready'||JSON.stringify(result.data)!==before;
   db.expenses=result.data;loaded=true;state='ready';window.payrollCloudSources.expenses='ready';
   // Save the current cloud collection, never the array captured on startup.
   if(changed)save();return changed;
  }catch{
   if(!loaded){state='unavailable';window.payrollCloudSources.expenses='unavailable'}
   return false;
  }finally{loading=false}
 };
 (async()=>{
  if(!await window.BD_CLOUD_READY){state='local';if(document.querySelector('#modal').hidden)render();return}
  await window.BD_REFRESH_EXPENSES(true);
  if(document.querySelector('#modal').hidden)render();
 })();
 if(document.querySelector('#modal').hidden)render();

 async function writeExpenses(method,body){
  if(!loaded)throw new Error('Cloud expenses are unavailable. Refresh and try again.');
  if(writing)throw new Error('An expense save is already in progress.');
  writing=true;generation++;
  try{
   const response=await fetch('/api/expenses',{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok||!result.data)throw new Error(result.error||'Expense could not be saved.');
   const records=Array.isArray(result.data)?result.data:[result.data];
   const ids=new Set(records.map(account=>account.id));
   db.expenses=[...db.expenses.filter(account=>!ids.has(account.id)),...records];
   return true;
  }finally{writing=false}
 }
 window.importCloudExpenses=records=>writeExpenses('POST',records);

 window.saveCloudExpense=(id,data)=>writeExpenses(id?'PUT':'POST',id?{...data,id}:data);
 const previousDelete=deleteRecord;
 deleteRecord=function(key,id){
  previousDelete(key,id);
  if(key!=='expenses')return;
  const button=document.querySelector('#modalBody [data-action="confirmDelete"]');
  if(!button)return;
  const title=document.querySelector('#modalTitle');
  if(title)title.textContent='Delete Expense';
  document.querySelector('#modalBody .formbody').textContent='Delete this expense from Cloudflare D1?';
  button.textContent='Delete Expense';
  button.onclick=async()=>{
   if(!loaded||writing)return toast('Cloud expenses are unavailable or busy.');
   writing=true;generation++;
   button.disabled=true;
   try{
    const response=await fetch('/api/expenses?id='+encodeURIComponent(id),{method:'DELETE'});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Expense could not be deleted.');
    db.expenses=db.expenses.filter(expense=>expense.id!==id);
    save();
    if(button.isConnected)closeModal();
    render();
    toast('Expense deleted from Cloudflare D1.');
   }catch(error){toast(error.message);button.disabled=false}
   finally{writing=false}
  };
 };
})();
