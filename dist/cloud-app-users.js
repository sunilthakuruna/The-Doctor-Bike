(() => {
 let loaded=false;
 async function load(){
  const response=await fetch('/api/app-users',{cache:'no-store'});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'Could not load server users.');
  db.users=result.data.map(user=>({...user,passwordHash:'server-managed'}));
  loaded=true;
 }
 const originalEdit=editRecord;
 editRecord=function(key,id,initial){
  if(key==='users'&&!loaded){toast('Wait for server users to load.');return}
  const result=originalEdit(key,id,initial);
  if(key==='users'){
   const form=document.querySelector('#recordForm');
   if(form)form.dataset.serverUserId=id||'';
   const input=document.querySelector('#newUserPassword');
   if(input){input.minLength=4;input.placeholder='At least 4 characters';}
  }
  return result;
 };
 document.addEventListener('submit',async event=>{
  const form=event.target;
  if(!form.hasAttribute('data-server-user-id'))return;
  event.preventDefault();event.stopImmediatePropagation();
  const id=form.dataset.serverUserId;
  const existing=db.users.find(user=>user.id===id);
  const body={...Object.fromEntries(new FormData(form)),id,password:document.querySelector('#newUserPassword')?.value||'',permissions:{},actionRestrictions:existing?.actionRestrictions||{}};
  form.querySelectorAll('[data-module][data-permission]').forEach(input=>{(body.permissions[input.dataset.module]||={})[input.dataset.permission]=input.checked});
  const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
  try{
   const response=await fetch('/api/app-users',{method:id?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'User save failed.');
   await load();closeModal();render();toast('User saved to the server.');
  }catch(error){toast(error.message)}finally{if(button)button.disabled=false}
 },true);
 (async()=>{if(!await window.BD_CLOUD_READY)return;try{await load();if(page==='users')render()}catch(error){if(page==='users')toast(error.message)}})();
})();
