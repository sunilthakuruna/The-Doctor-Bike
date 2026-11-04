(() => {
 const dialog=document.createElement('dialog');
 dialog.style.cssText='width:min(92vw,420px);padding:24px;border:1px solid #ccd5e0;border-radius:12px';
 dialog.innerHTML='<form><h2>BIKE DOCTOR Owner Sign-in</h2><p role="status"></p><div hidden><label>One-time setup token <input name="setupToken" type="password" autocomplete="off"></label></div><p><label>Email <input name="email" type="email" autocomplete="username" required></label></p><p><label>Password <input name="password" type="password" autocomplete="current-password" minlength="12" maxlength="256" required></label></p><button class="btn primary" disabled>Sign in</button></form>';
 const form=dialog.querySelector('form');
 const status=form.querySelector('[role=status]');
 const button=form.querySelector('button');
 dialog.addEventListener('cancel',event=>event.preventDefault());
 const ready=(async()=>{
  try{
   const response=await fetch('/api/auth',{cache:'no-store'});
   if(!response.ok)throw new Error();
   const state=await response.json();
   if(state.authenticated)return true;
   form.elements.setupToken.parentElement.parentElement.hidden=state.configured;
   form.elements.setupToken.required=!state.configured;
   if(!state.configured){
    form.elements.password.autocomplete='new-password';
    button.textContent='Create owner account';
   }
   button.disabled=false;
  }catch{status.textContent='Cloud sign-in is unavailable. Refresh to retry.'}
  document.body.append(dialog);
  dialog.showModal();
  return false;
 })();
 window.BD_CLOUD_READY=ready;
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  button.disabled=true;
  status.textContent='';
  try{
   const response=await fetch('/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
   const result=await response.json();
   if(!response.ok||!result.authenticated)throw new Error(result.error||'Sign-in failed.');
   location.reload();
  }catch(error){status.textContent=error.message;button.disabled=false}
 });
 document.addEventListener('click',async event=>{
  if(!event.target.closest('#profileSignOut,#sessionSignOutAction'))return;
  event.preventDefault();
  event.stopImmediatePropagation();
  try{
   const response=await fetch('/api/auth',{method:'DELETE'});
   if(!response.ok)throw new Error();
   localStorage.removeItem('bike-doctor-active-user-v1');
   location.reload();
  }catch{toast('Cloud sign-out failed. Please try again.')}
 },true);
})();
