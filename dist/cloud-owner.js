// One application login, verified by the server.
(() => {
 let identitySignature='',checking=false;
 const offlineKey='bike-doctor-offline-login-v1';
 async function verifier(password,salt){
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bytes=await crypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(salt),iterations:150000,hash:'SHA-256'},key,256);
  return Array.from(new Uint8Array(bytes)).map(value=>value.toString(16).padStart(2,'0')).join('');
 }
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
   localStorage.removeItem(offlineKey);
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
   const credentials=Object.fromEntries(new FormData(form));
   if(navigator.onLine===false){
    const cached=JSON.parse(localStorage.getItem(offlineKey)||'null');
    if(!cached||Date.now()>cached.expires||String(credentials.username).trim().toLowerCase()!==cached.user.username.toLowerCase()||await verifier(credentials.password,cached.salt)!==cached.hash)throw new Error('Offline sign-in is unavailable or the password is incorrect. Sign in online on this device first.');
    window.BD_OFFLINE_SESSION=true;window.BD_SET_SERVER_USER(cached.user);
    toast('Offline access: cloud operations require a connection.');return;
   }
   const response=await fetch('/api/app-auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(credentials)});
   const result=await response.json();
   if(!response.ok||!result.authenticated)throw new Error(result.error||'Sign-in failed.');
   const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)));
   localStorage.setItem(offlineKey,JSON.stringify({user:result.user,salt,hash:await verifier(credentials.password,salt),expires:Date.now()+7*86400000}));
   location.reload();
  }catch(error){window.BD_SHOW_SERVER_LOGIN(error.message)}
  finally{if(button)button.disabled=false}
 },true);
 document.addEventListener('click',async event=>{
  if(!event.target.closest('#profileSignOut,#sessionSignOutAction'))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(window.BD_OFFLINE_SESSION){localStorage.removeItem(offlineKey);localStorage.removeItem('bike-doctor-active-user-v1');location.reload();return}
  try{
   const response=await fetch('/api/app-auth',{method:'DELETE'});
   if(!response.ok)throw new Error();
   localStorage.removeItem('bike-doctor-active-user-v1');location.reload();
  }catch{toast('Sign-out failed. Please try again.')}
 },true);
})();
