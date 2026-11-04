// Staff Master uses D1 as its persistent source.
(() => {
 let revision=0;
 const localStaff=db.staff;
 const saveWorkspace=save;
 save=function(...args){
  const current=db.staff;
  db.staff=localStaff;
  try{return saveWorkspace.apply(this,args)}finally{db.staff=current}
 };
 async function loadStaff() {
  if(!await window.BD_CLOUD_READY)return;
  const started=revision;
  try {
   const response=await fetch('/api/staff',{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw new Error(result.error||'Staff list unavailable');
   if(started!==revision)return;
   db.staff=result.data;
   save();
   if(['staff','attendance','payroll','jobs','expenses'].includes(page) && document.querySelector('#modal').hidden)render();
  }catch(error){console.warn('Staff cloud load failed',error);if(page==='staff')toast('Could not load staff from D1. Please refresh and try again.')}
 }
 document.addEventListener('submit',async event=>{
  const form=event.target;
  if(form?.getAttribute('id')!=='recordForm'||editing?.key!=='staff')return;
  event.preventDefault();event.stopImmediatePropagation();
  if(form.dataset.cloudSaving)return;
  const editId=editing.id;
  const values={...db.staff.find(item=>item.id===editId),...Object.fromEntries(new FormData(form))};
  if(editId)values.id=editId;
  if(form.querySelector('input[type="file"]:disabled')){
   toast('Wait for the staff attachment to finish loading.');
   return;
  }
  values.salary=Number(values.salary);
  values.experience=Number(values.experience);
  form.dataset.cloudSaving='true';
  const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
  revision++;
  try {
   const response=await fetch('/api/staff',{method:editId?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(values)});
   const result=await response.json();
   if(!response.ok||!result.data?.id)throw new Error(result.error||'Staff could not be saved');
   db.staff=db.staff.filter(item=>item.id!==result.data.id);db.staff.push(result.data);
   save();closeModal();render();toast('Staff saved to Cloudflare D1.');
  }catch(error){toast(error.message);delete form.dataset.cloudSaving;if(button)button.disabled=false}
 },true);
 const previousDelete=deleteRecord;
 deleteRecord=function(key,id){
  previousDelete(key,id);
  if(key!=='staff')return;
  const button=document.querySelector('#modalBody [data-action="confirmDelete"]');
  if(!button)return;
  button.onclick=async()=>{
   button.disabled=true;revision++;
   try {
    const response=await fetch('/api/staff?id='+encodeURIComponent(id),{method:'DELETE'});
    if(!response.ok)throw new Error((await response.json()).error||'Staff could not be deleted from D1.');
    db.staff=db.staff.filter(item=>item.id!==id);save();closeModal();render();toast('Staff deleted from Cloudflare D1.');
   }catch(error){toast(error.message);button.disabled=false}
  };
 };
 window.addEventListener('hashchange',()=>{if(location.hash==='#staff')loadStaff()});
 loadStaff();
})();

