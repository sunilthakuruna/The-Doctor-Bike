(() => {
 const localAccounts=db.accounts;
 const saveWorkspace=save;
 save=function(...args){
  const current=db.accounts;
  db.accounts=localAccounts;
  try{return saveWorkspace.apply(this,args)}finally{db.accounts=current}
 };
 let loaded=false;
 let writing=false;
 (async()=>{
  if(!await window.BD_CLOUD_READY)return;
  try{
   const response=await fetch('/api/accounts',{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw new Error();
   db.accounts=result.data;
   loaded=true;
   if(document.querySelector('#modal').hidden)render();
  }catch{toast('Cloud accounts could not be loaded. Refresh to retry.')}
 })();

 async function writeAccounts(method,body){
  if(!loaded)throw new Error('Cloud accounts are unavailable. Refresh and try again.');
  if(writing)throw new Error('An account save is already in progress.');
  writing=true;
  try{
   const response=await fetch('/api/accounts',{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();
   if(!response.ok||!result.data)throw new Error(result.error||'Account could not be saved.');
   const records=Array.isArray(result.data)?result.data:[result.data];
   const ids=new Set(records.map(account=>account.id));
   db.accounts=[...db.accounts.filter(account=>!ids.has(account.id)),...records];
   return true;
  }finally{writing=false}
 }
 window.importCloudAccounts=records=>writeAccounts('POST',records);

 document.addEventListener('submit',async event=>{
  const form=event.target;
  if(form?.getAttribute('id')!=='recordForm'||editing?.key!=='accounts')return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const id=editing.id;
  const values=Object.fromEntries(new FormData(form));
  if(id)values.id=id;
  const button=form.querySelector('[type="submit"]');
  if(button)button.disabled=true;
  try{
   await writeAccounts(id?'PUT':'POST',values);
   if(form.isConnected)closeModal();
   render();
   toast('Account saved to Cloudflare D1.');
  }catch(error){toast(error.message)}
  finally{if(button)button.disabled=false}
 },true);

 const previousDelete=deleteRecord;
 deleteRecord=function(key,id){
  if(key!=='accounts')return previousDelete(key,id);
  const account=find('accounts',id);
  if(!account)return;
  if(account.status==='Inactive')return toast('This account is already inactive. Edit it to reactivate.');
  openModal('Mark Account Inactive',
   '<div class="formbody"><p>Mark <strong>'+esc(account.name)+'</strong> inactive? Its ID and transaction links will be preserved.</p></div>'+
   '<div class="formactions">'+btn('Cancel','cancel','secondary')+btn('Mark Inactive','confirmDelete','danger')+'</div>');
  const button=document.querySelector('#modalBody [data-action="confirmDelete"]');
  button.onclick=async()=>{
   button.disabled=true;
   try{
    await writeAccounts('PUT',{...account,status:'Inactive'});
    if(button.isConnected)closeModal();
    render();
    toast('Account marked inactive in Cloudflare D1.');
   }catch(error){toast(error.message);button.disabled=false}
  };
 };
})();
