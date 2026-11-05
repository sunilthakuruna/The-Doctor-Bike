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
   if(input){
    input.minLength=4;input.placeholder=id?'New password (blank keeps current)':'At least 4 characters';
    const notice=document.querySelector('.userSecuritySettings .notice');
    if(notice)notice.textContent='Only administrators can change passwords here. Enter a new password and use Show to read it before saving. Previously saved passwords cannot be retrieved.';
   }
   const lockUserPermissions=()=>{
    const admin=form?.elements.role?.value==='Admin';
    form?.querySelectorAll('[data-module="users"],[data-module="backup-restore"]').forEach(control=>{
     control.checked=admin;
     control.disabled=!admin;
     const moduleName=control.dataset.module==='backup-restore'?'Backup & Restore':'Users';
     control.title=admin?'Included automatically with the Admin role.':moduleName+' is reserved for the Admin role.';
     control.onchange=()=>{control.checked=form.elements.role?.value==='Admin'};
     const row=control.closest('tr');
     if(row){
      const label=row.querySelector('td');
      if(label){label.textContent=moduleName+(admin?' — Admin has full access':' — Admin only');}
     }
    });
   };
   lockUserPermissions();
   form?.elements.role?.addEventListener('change',lockUserPermissions);
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
  const admin=body.role==='Admin';
  body.permissions.users={read:admin,write:admin,edit:admin,delete:admin};
  const button=form.querySelector('[type=submit]');if(button)button.disabled=true;
  try{
   const response=await fetch('/api/app-users',{method:id?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'User save failed.');
   await load();closeModal();render();toast('User saved to the server.');
  }catch(error){toast(error.message)}finally{if(button)button.disabled=false}
 },true);
 (async()=>{if(!await window.BD_CLOUD_READY)return;try{await load();if(page==='users')render()}catch(error){if(page==='users')toast(error.message)}})();
})();
