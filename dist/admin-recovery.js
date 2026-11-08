(()=>{
 let dialog;
 const guide=(username,code)=>`BIKE DOCTOR — ADMIN PASSWORD RECOVERY\n\nPRIVATE: anyone with this code can reset this administrator account. Do not share this file.\nApp: ${location.origin}/\nAdministrator username: ${username}\nRecovery code: ${code}\n\nSAVE THIS FILE\n1. Download this file and open your private Google Drive.\n2. Choose New > File upload and select this file. Do not enable link sharing.\n3. Protect your Google account with two-step verification and keep a separate secure backup.\n\nRECOVER A FORGOTTEN PASSWORD\n1. Connect to the internet and open the app address above.\n2. On Sign In, select Recover Admin Access.\n3. Enter the administrator username shown above.\n4. Copy the recovery code from this private file into Recovery Code.\n5. Enter and confirm a new password (at least 4 characters).\n6. Select Reset Password once and wait for confirmation.\n7. Download the NEW recovery code and guide displayed after the reset.\n8. Replace this old file in Google Drive with the new file. The old code no longer works.\n9. Close recovery and sign in with the username and new password.\n\nIMPORTANT\nGenerating a replacement code invalidates the previous code. Each recovery code can be used only once. Password changes also invalidate the existing recovery code; sign in and generate a new one after changing a password in User Management. Business records are unchanged. Old online sessions are invalidated; a device already offline may retain its previously authorized offline access until it reconnects or that offline access expires. Sign in online on each device with your new password.\nIf both the password and code are lost, another active admin can reset the password in User Management. If no other admin is available, recovery requires authorized Cloudflare database access. Never delete the database to recover a password.\n`;
 function close(){dialog?.close();dialog?.remove();dialog=null}
 function open(generate){
  close();dialog=document.createElement('dialog');dialog.className='adminRecoveryDialog';dialog.setAttribute('aria-label',generate?'Administrator recovery code':'Recover Admin Access');
  dialog.innerHTML='<div class="adminRecoveryHead"><h2>'+(generate?'Administrator Recovery Code':'Recover Admin Access')+'</h2><button type="button" data-recovery-close aria-label="Close recovery">×</button></div><form class="adminRecoveryForm"><p>'+(generate?'Confirm your current password to generate a private recovery code. This replaces any previous recovery code.':'Use the private recovery code saved earlier. An internet connection is required.')+'</p>'+(generate?'':'<label>Administrator username<input name="username" autocomplete="username" required maxlength="200"></label><label>Recovery code<input name="code" autocomplete="off" spellcheck="false" required></label>')+'<label>'+(generate?'Current password':'New password')+'<input name="password" type="password" autocomplete="'+(generate?'current-password':'new-password')+'" minlength="4" maxlength="256" required></label>'+(generate?'':'<label>Confirm new password<input name="confirm" type="password" autocomplete="new-password" minlength="4" maxlength="256" required></label>')+'<p role="status" aria-live="polite" class="adminRecoveryStatus"></p><button type="submit" class="btn">'+(generate?'Generate Recovery Code':'Reset Password')+'</button></form>';
  document.body.appendChild(dialog);dialog.showModal();dialog.querySelector('[data-recovery-close]').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
  dialog.querySelector('form').onsubmit=async event=>{
   event.preventDefault();const form=event.target,values=Object.fromEntries(new FormData(form)),status=form.querySelector('[role="status"]'),submit=form.querySelector('[type="submit"]');
   if(navigator.onLine===false){status.textContent='Connect to the internet to continue.';return}
   if(!generate&&values.password!==values.confirm){status.textContent='The new passwords do not match.';return}
   submit.disabled=true;status.textContent='Please wait…';
   try{
    const response=await fetch('/api/admin-recovery',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(generate?{action:'generate',password:values.password}:{action:'recover',username:values.username,code:values.code,newPassword:values.password})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Recovery failed.');
    form.reset();if(!dialog?.isConnected)return;
    form.innerHTML='<p>'+(generate?'Recovery code generated.':'Password changed. Sign in with your new password.')+'</p><p>Save this replacement code now. It is shown only here and replaces your old code.</p><label>Private recovery code<textarea readonly rows="4" aria-label="Private recovery code"></textarea></label><button type="button" class="btn" data-recovery-download>Download Code &amp; Step-by-Step Guide</button><p>Upload the downloaded file to your private Google Drive. Keep it unshared.</p><button type="button" class="btn secondary" data-recovery-done>'+(generate?'Done':'Return to Sign In')+'</button>';
    form.querySelector('textarea').value=result.code;
    form.querySelector('[data-recovery-download]').onclick=()=>{const url=URL.createObjectURL(new Blob([guide(result.username,result.code)],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Bike-Doctor-PRIVATE-Admin-Recovery.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
    form.querySelector('[data-recovery-done]').onclick=()=>{close();if(!generate){localStorage.removeItem('bike-doctor-offline-login-v1');location.reload()}};
   }catch(error){status.textContent=error.message;submit.disabled=false}
  };
 }
 function mount(){
  const login=document.querySelector('#userLoginForm');
  if(login&&!login.parentElement.querySelector('[data-admin-recover]')){const button=document.createElement('button');button.type='button';button.className='btn secondary adminRecoveryLink';button.dataset.adminRecover='';button.textContent='Recover Admin Access';button.onclick=()=>open(false);login.after(button)}
  if(typeof page!=='undefined'&&page==='users'&&window.BD_HAS_MODULE_ACCESS?.('users')){
   const toolbar=document.querySelector('#content .toolbar');
   if(toolbar&&!toolbar.querySelector('[data-admin-recovery-code]')){const button=document.createElement('button');button.type='button';button.className='btn adminRecoveryLink';button.dataset.adminRecoveryCode='';button.textContent='Admin Recovery Code';button.onclick=()=>open(true);toolbar.appendChild(button)}
  }
 }
 new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});mount();
})();
