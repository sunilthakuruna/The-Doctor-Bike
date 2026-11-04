(() => {
 const localExpenses=db.expenses;
 const saveWorkspace=save;
 save=function(...args){
  const current=db.expenses;
  db.expenses=localExpenses;
  try{return saveWorkspace.apply(this,args)}finally{db.expenses=current}
 };
 let loaded=false;
 let writing=false;
 (async()=>{
  if(!await window.BD_CLOUD_READY)return;
  try{
   const response=await fetch('/api/expenses',{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw new Error();
   db.expenses=result.data;
   loaded=true;
   window.payrollCloudSources.expenses='ready';
   if(document.querySelector('#modal').hidden)render();
  }catch{window.payrollCloudSources.expenses='unavailable';if(page==='payroll'&&document.querySelector('#modal').hidden)render();toast('Cloud expenses could not be loaded. Refresh to retry.')}
 })();

 async function writeExpenses(method,body){
  if(!loaded)throw new Error('Cloud expenses are unavailable. Refresh and try again.');
  if(writing)throw new Error('An expense save is already in progress.');
  writing=true;
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
   writing=true;
   button.disabled=true;
   try{
    const response=await fetch('/api/expenses?id='+encodeURIComponent(id),{method:'DELETE'});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Expense could not be deleted.');
    db.expenses=db.expenses.filter(expense=>expense.id!==id);
    if(button.isConnected)closeModal();
    render();
    toast('Expense deleted from Cloudflare D1.');
   }catch(error){toast(error.message);button.disabled=false}
   finally{writing=false}
  };
 };
})();
