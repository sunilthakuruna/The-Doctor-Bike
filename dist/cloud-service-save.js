// Service Master uses D1 as its persistent source.
(() => {
 let revision=0;
 async function loadServices() {
  if(window.BD_CLOUD_READY && !await window.BD_CLOUD_READY)return;
  const started=revision;
  try {
   const response=await fetch('/api/services',{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw new Error(result.error||'Service list unavailable');
   if(started!==revision)return;
   db.services=result.data;
   save();
   if(page==='services' && document.querySelector('#modal').hidden)render();
  }catch(error){console.warn('Service cloud load failed',error);if(page==='services')toast('Could not load services from D1. Please refresh and try again.')}
 }
 document.addEventListener('submit',async event=>{
  const form=event.target;
  if(form?.getAttribute('id')!=='recordForm'||editing?.key!=='services')return;
  event.preventDefault();event.stopImmediatePropagation();
  if(form.dataset.cloudSaving)return;
  const editId=editing.id;
  const values={...db.services.find(item=>item.id===editId),...Object.fromEntries(new FormData(form))};
  if(editId)values.id=editId;
  values.charge=Number(values.charge);
  form.dataset.cloudSaving='true';
  const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
  revision++;
  try {
   const response=await fetch('/api/services',{method:editId?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(values)});
   const result=await response.json();
   if(!response.ok||!result.data?.id)throw new Error(result.error||'Service could not be saved');
   db.services=db.services.filter(item=>item.id!==result.data.id);db.services.push(result.data);
   save();closeModal();render();toast('Service saved to Cloudflare D1.');
  }catch(error){toast(error.message);delete form.dataset.cloudSaving;if(button)button.disabled=false}
 },true);
 const previousDelete=deleteRecord;
 deleteRecord=function(key,id){
  previousDelete(key,id);
  if(key!=='services')return;
  const button=document.querySelector('#modalBody [data-action="confirmDelete"]');
  if(!button)return;
  button.onclick=async()=>{
   button.disabled=true;revision++;
   try {
    const response=await fetch('/api/services?id='+encodeURIComponent(id),{method:'DELETE'});
    if(!response.ok)throw new Error('Service could not be deleted from D1.');
    db.services=db.services.filter(item=>item.id!==id);save();closeModal();render();toast('Service deleted from Cloudflare D1.');
   }catch(error){toast(error.message);button.disabled=false}
  };
 };
 window.addEventListener('hashchange',()=>{if(location.hash==='#services')loadServices()});
 loadServices();
})();

