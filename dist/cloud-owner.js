// One application login, verified by the server.
(() => {
 let identitySignature='',checking=false;
 async function refreshIdentity(){
  if(checking||document.visibilityState!=='visible')return;
  checking=true;
  try{
   const response=await fetch('/api/app-auth',{cache:'no-store'});
   if(!response.ok)return;
   const state=await response.json();
   if(!state.authenticated){if(identitySignature)location.reload();return}
   const signature=JSON.stringify(state.user);
   if(signature!==identitySignature){
    if(!document.querySelector('#modal')?.hidden)return;
    identitySignature=signature;window.BD_SET_SERVER_USER(state.user);
   }
  }catch{}finally{checking=false}
 }
 window.addEventListener('focus',refreshIdentity);
 document.addEventListener('visibilitychange',refreshIdentity);
 setInterval(refreshIdentity,15000);
 window.BD_CLOUD_READY=(async()=>{
  try{
   const response=await fetch('/api/app-auth',{cache:'no-store'});
   if(!response.ok)throw new Error('Sign-in service is unavailable.');
   const state=await response.json();
   if(state.authenticated&&state.user){identitySignature=JSON.stringify(state.user);window.BD_SET_SERVER_USER(state.user);return true}
   window.BD_SHOW_SERVER_LOGIN('Sign in with your server username and password.');
  }catch(error){window.BD_SHOW_SERVER_LOGIN(error.message)}
  return false;
 })();
 document.addEventListener('submit',async event=>{
  if(event.target.getAttribute('id')!=='userLoginForm')return;
  event.preventDefault();event.stopImmediatePropagation();
  const form=event.target,button=form.querySelector('[type=submit]');
  if(button)button.disabled=true;
  try{
   const response=await fetch('/api/app-auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
   const result=await response.json();
   if(!response.ok||!result.authenticated)throw new Error(result.error||'Sign-in failed.');
   location.reload();
  }catch(error){window.BD_SHOW_SERVER_LOGIN(error.message)}
  finally{if(button)button.disabled=false}
 },true);
 document.addEventListener('click',async event=>{
  if(!event.target.closest('#profileSignOut,#sessionSignOutAction'))return;
  event.preventDefault();event.stopImmediatePropagation();
  try{
   const response=await fetch('/api/app-auth',{method:'DELETE'});
   if(!response.ok)throw new Error();
   localStorage.removeItem('bike-doctor-active-user-v1');location.reload();
  }catch{toast('Sign-out failed. Please try again.')}
 },true);
})();
