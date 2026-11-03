// Vehicle Master uses D1 as its persistent source.
(() => {
 let revision=0;
 async function loadVehicles() {
  const started=revision;
  try {
   const response=await fetch('/api/vehicles',{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw new Error(result.error||'Vehicle list unavailable');
   if(started!==revision)return;
   db.bikes=result.data;
   save();
   if(page==='bikes' && document.querySelector('#modal').hidden)render();
  }catch(error){console.warn('Vehicle cloud load failed',error);if(page==='bikes')toast('Could not load vehicles from D1. Please refresh and try again.')}
 }
 document.addEventListener('submit',async event=>{
  const form=event.target;
  if(form?.getAttribute('id')!=='recordForm'||editing?.key!=='bikes')return;
  event.preventDefault();event.stopImmediatePropagation();
  if(form.dataset.cloudSaving)return;
  const editId=editing.id;
  const values={...db.bikes.find(item=>item.id===editId),...Object.fromEntries(new FormData(form))};
  if(editId)values.id=editId;
  values.number=String(values.number||'').trim().toUpperCase();
  values.amcScope=values.amcType?'vehicle':'none';
  try {if(typeof validateCustomerAmc==='function')validateCustomerAmc(values)}catch(error){toast(error.message);return}
  form.dataset.cloudSaving='true';
  const button=form.querySelector('[type="submit"]');if(button)button.disabled=true;
  revision++;
  try {
   const response=await fetch('/api/vehicles',{method:editId?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(values)});
   const result=await response.json();
   if(!response.ok||!result.data?.id)throw new Error(result.error||'Vehicle could not be saved');
   db.bikes=db.bikes.filter(item=>item.id!==result.data.id);db.bikes.push(result.data);
   save();closeModal();render();toast('Vehicle saved to Cloudflare D1.');
  }catch(error){toast(error.message);delete form.dataset.cloudSaving;if(button)button.disabled=false}
 },true);
 const previousDelete=deleteRecord;
 deleteRecord=function(key,id){
  previousDelete(key,id);
  if(key!=='bikes')return;
  const button=document.querySelector('#modalBody [data-action="confirmDelete"]');
  if(!button)return;
  button.onclick=async()=>{
   button.disabled=true;revision++;
   try {
    const response=await fetch('/api/vehicles?id='+encodeURIComponent(id),{method:'DELETE'});
    if(!response.ok)throw new Error('Vehicle could not be deleted from D1.');
    db.bikes=db.bikes.filter(item=>item.id!==id);save();closeModal();render();toast('Vehicle deleted from Cloudflare D1.');
   }catch(error){toast(error.message);button.disabled=false}
  };
 };
 window.addEventListener('hashchange',()=>{if(location.hash==='#bikes')loadVehicles()});
 loadVehicles();
})();
