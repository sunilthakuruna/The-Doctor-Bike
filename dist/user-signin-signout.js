/* Local individual sign-in/sign-out for the prototype workspace. */
(function(){
  const sessionKey='bike-doctor-active-user-v1';
  let activeUser=null;
  const toBytes=base64=>Uint8Array.from(atob(base64),char=>char.charCodeAt(0));
  const encode=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes)));
  async function passwordHash(password,salt,iterations=150000){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations,hash:'SHA-256'},material,256)}
  async function isCorrectPassword(user,password){if(!user.passwordHash||!user.passwordSalt)return false;const digest=await passwordHash(password,toBytes(user.passwordSalt),Number(user.passwordIterations||150000));return encode(digest)===user.passwordHash}
  function setActiveUser(user){activeUser=user;localStorage.setItem(sessionKey,user.id);updateHeader();render()}
  function canOpenModule(key){
    if(!activeUser)return false;
    if(key==='backup-restore')return activeUser.role==='Admin';
    if(activeUser.role==='Admin')return true;
    if(key==='dashboard')return true;
    if(key==='reports')return !!activeUser.permissions?.reports?.read||Object.keys(activeUser.permissions||{}).some(id=>id.startsWith('report-')&&activeUser.permissions[id]?.read);
    return !!activeUser.permissions?.[key]?.read;
  }
  const permissionModuleLabels={dashboard:'Dashboard',settings:'Business Setting',lists:'List Management',customers:'Customer Master',bikes:'Vehicle Master',insurance:'Insurance',staff:'Staff Master',attendance:'Staff Attendance',payroll:'Per Job Salary',services:'Service Master',accounts:'Account Master',appointments:'Appointment Booking',jobs:'Job Card',parts:'Spare Parts',godown:'Godown Stock',sales:'Spare Parts Sale',purchases:'Purchase','service-reminders':'Vehicle Service Reminders','amc-plans':'AMC Management / Reminder',payments:'Payment Details',reports:'Reports',expenses:'Expenses',users:'Users',audit:'Audit Logs'};
  function actionName(key,permission,element){
    const data=element?.dataset||{};
    if(data.invoice)return 'Print Invoice';if(data.receive)return 'Receive Payment';
    const names={customers:{write:'Add Customer',edit:'Edit Customer',delete:'Delete Customer'},bikes:{write:'Add Vehicle',edit:'Edit Vehicle',delete:'Delete Vehicle'},staff:{write:'Add Staff',edit:'Edit Staff',delete:'Delete Staff'},services:{write:'Add Service',edit:'Edit Service',delete:'Delete Service'},jobs:{write:'Add Job Card',edit:'Edit Job Card',delete:'Delete Job Card'},parts:{write:'Add Spare Part',edit:'Edit Spare Part',delete:'Delete Spare Part'},sales:{write:'Add Sale',edit:'Edit Sale',delete:'Delete Sale'},purchases:{write:'Add Purchase',edit:'Edit Purchase',delete:'Delete Purchase'},expenses:{write:'Add Expense',edit:'Edit Expense',delete:'Delete Expense'},accounts:{write:'Add Account',edit:'Edit Account'},appointments:{write:'Add Appointment',edit:'Edit Appointment',delete:'Delete Appointment'},users:{write:'Add User',edit:'Edit User'},insurance:{write:'Add Policy',edit:'Edit Policy',delete:'Delete Policy'}};
    return names[key]?.[permission]||'';
  }
  function canPerform(key,permission,element){
    if(!canOpenModule(key))return false;
    if(activeUser?.role==='Admin')return true;
    if(!activeUser?.permissions?.[key]?.[permission])return false;
    const module=permissionModuleLabels[key],subAction=actionName(key,permission,element);
    return !(module&&subAction&&activeUser?.actionRestrictions?.[module]?.[subAction]);
  }
  function actionTarget(element){
    const data=element.dataset;
    if(data.new)return {key:data.new,permission:'write'};
    if(data.edit)return {key:data.edit.split('|')[0],permission:'edit'};
    if(data.delete)return {key:data.delete.split('|')[0],permission:'delete'};
    if(data.receive)return {key:data.receive.split('|')[0],permission:'write'};
    if(data.invoice)return {key:data.invoice.split('|')[0],permission:'read'};
    if(data.status!==undefined)return {key:page,permission:'edit'};
    if(['add','addService','addPart'].includes(data.action))return {key:page,permission:'write'};
    if(['removeline','removeoption'].includes(data.action)||data.removeline!==undefined||data.removeoption!==undefined)return {key:page,permission:'delete'};
    return data.page?{key:data.page,permission:'read'}:null;
  }
  function lockRestrictedNavigation(){
    $$('#navigation [data-page]').forEach(link=>{if(!canOpenModule(link.dataset.page))link.remove()});
    $$('#navigation h3').forEach(heading=>{let next=heading.nextElementSibling,hasLink=false;while(next&&next.tagName!=='H3'){if(next.matches?.('[data-page]')||next.querySelector?.('[data-page]'))hasLink=true;next=next.nextElementSibling}if(!hasLink)heading.remove()});
  }
  function lockRestrictedActions(){
    $$('#content [data-new],#content [data-edit],#content [data-delete],#content [data-receive],#content [data-invoice],#content [data-status],#content [data-action],#content [data-removeline],#content [data-removeoption]').forEach(element=>{
      const target=actionTarget(element);if(!target||canPerform(target.key,target.permission,element))return;
      element.remove();
    });
  }
  function updateHeader(){
    const profile=$('#profile');if(!profile)return;
    const user=activeUser;
    if(!user){
      profile.innerHTML='<span class="avatar">↪</span><span>Sign In<small>Individual access</small></span>';
      $('#signOutButton')?.remove();
      profile.onclick=()=>showGate('Sign in with your individual username and password.');return;
    }
    profile.innerHTML=`<span class="avatar">${esc((user.name||user.username||'?')[0].toUpperCase())}</span><span>${esc(user.username||user.name)}<small>${esc(user.role||'User')}</small></span><span class="profileChevron" aria-hidden="true">⌄</span>`;
    $('#signOutButton')?.remove();
    profile.setAttribute('role','button');profile.setAttribute('tabindex','0');profile.setAttribute('aria-label','Open user profile and access menu');
    profile.onclick=()=>{if($('#modal .profileAccess')&&!$('#modal').hidden)closeModal();else openProfile()};
    profile.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();profile.click()}};
  }
  function openProfile(){
    const user=activeUser||db.users.find(item=>item.role==='Admin');
    // Keep this catalog aligned with User Management, including modules shown under Reports.
    const modules=[
      ['dashboard','Dashboard','dashboard'],['settings','Business Setting','settings'],['lists','List Management','list'],
      ['customers','Customer Master','users'],['bikes','Vehicle Master','bike'],['insurance','Insurance','shield'],
      ['staff','Staff Master','users'],['attendance','Staff Attendance','calendar'],['payroll','Per Job Salary','wallet'],
      ['services','Service Master','wrench'],['accounts','Account Master','wallet'],['appointments','Appointment Booking','calendar'],
      ['jobs','Job Card','clipboard'],['parts','Spare Parts','box'],['godown','Godown Stock','box'],['sales','Spare Parts Sale','cart'],
      ['purchases','Purchase','cart'],['service-reminders','Vehicle Service Reminders','bell'],['amc-plans','AMC Management / Reminder','shield'],
      ['payments','Payment Details','wallet'],['reports','Reports','chart'],['expenses','Expenses','wallet'],['users','Users','users'],
      ['audit','Audit Logs','shield'],['backup-restore','Backup & Restore','shield'],['report-sales','Sales Report','chart'],['report-purchases','Purchase Report','chart'],['report-gst','GST Annual Report','chart'],
      ['report-dues','Outstanding Dues Report','chart'],['report-profit','Profit Report','chart'],['report-collection','Collection Report','chart'],
      ['report-stock','Stock Verification Report','chart'],['report-vendor-purchases','Vendor-wise Spare Parts Purchases','chart']
    ].map(([id,label,glyph])=>({id,label,glyph}));
    const isAdmin=user?.role==='Admin';
    const canAccess=module=>isAdmin||(module.id!=='backup-restore'&&!!user?.permissions?.[module.id]?.read);
    const rows=modules.map(module=>`<article class="accessRow" data-access-row data-access="${canAccess(module)?'yes':'no'}"><span class="accessIcon">${icon(module.glyph)}</span><strong>${esc(module.label)}</strong><span class="accessBadge ${canAccess(module)?'allowed':'restricted'}">${canAccess(module)?'✓ Full Access':'Restricted'}</span></article>`).join('');
    openModal('User Profile & Access',`<section class="profileAccess"><div class="profileAccessHero" role="banner"><div class="profileHeroTitle"><span class="profileShield">${icon('shield')}</span><p>USER PROFILE & ACCESS</p><button type="button" class="profileClose" id="profileClose" aria-label="Close">×</button></div><div class="profileIdentity"><span class="profileAvatar">${esc((user?.name||user?.username||'?')[0].toUpperCase())}</span><div><h3>${esc(user?.name||user?.username||'User')}</h3><b>${esc(user?.role||'User')}</b><small>${esc(user?.username||'')}</small></div></div></div><div class="profileAccessBody"><h4>MODULE PERMISSIONS</h4><strong class="accessSummary">✓ ${isAdmin?`All ${modules.length} modules accessible (Super Admin)`:`${modules.filter(canAccess).length} of ${modules.length} modules accessible`}</strong><div class="accessTabs"><button type="button" data-access-filter="all" class="active">All (${modules.length})</button><button type="button" data-access-filter="yes">Accessible (${modules.filter(canAccess).length})</button><button type="button" data-access-filter="no">Restricted (${modules.filter(module=>!canAccess(module)).length})</button></div><label class="accessSearch">⌕ <input id="profileModuleSearch" placeholder="Search modules..."></label><div class="accessRows">${rows}</div></div><footer class="profileAccessFooter"><span>Local workspace session</span><button type="button" class="btn danger" id="profileSignOut">${icon('logout')} Sign Out</button></footer></section>`);
    $('#profileClose').onclick=closeModal;$('#profileSignOut').onclick=signOut;
    const applyFilter=mode=>{const query=$('#profileModuleSearch').value.trim().toLowerCase();$$('[data-access-row]').forEach(row=>{row.hidden=(mode!=='all'&&row.dataset.access!==mode)||!row.textContent.toLowerCase().includes(query)})};
    $$('[data-access-filter]').forEach(button=>button.onclick=()=>{$$('[data-access-filter]').forEach(item=>item.classList.toggle('active',item===button));applyFilter(button.dataset.accessFilter)});$('#profileModuleSearch').oninput=()=>{const selected=$('[data-access-filter].active');applyFilter(selected?.dataset.accessFilter||'all')};
  }
  function showGate(message=''){
    let gate=$('#userLoginGate');if(!gate){gate=document.createElement('section');gate.id='userLoginGate';document.body.appendChild(gate)}
    gate.innerHTML=`<div class="userLoginCard"><div class="userLoginBrand"><span class="avatar">BD</span><div><strong>${esc(db.settings.name||'BIKE DOCTOR')}</strong><small>Garage Management System</small></div></div><h2>Sign In</h2><p>Use your individual username and password.</p>${message?`<div class="userLoginMessage">${esc(message)}</div>`:''}<form id="userLoginForm"><label>Username<input name="username" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="4" required></label><button class="btn" type="submit">${icon('check')}Sign In</button></form><small class="userLoginNote">First-time owner setup: enter the Admin username and choose a new password if no owner password has been set yet.</small></div>`;
    gate.hidden=false;
    $('#userLoginForm').onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(event.target)),user=(db.users||[]).find(item=>String(item.username||'').toLowerCase()===String(data.username||'').trim().toLowerCase());if(!user||user.status==='Inactive')return showGate('Username is not active or does not exist.');if(!user.passwordHash){if(user.role!=='Admin')return showGate('This user does not have a password yet. Ask the administrator to set one in User Management.');if(data.password.length<4)return showGate('Set an owner password with at least 4 characters.');try{const salt=crypto.getRandomValues(new Uint8Array(16)),hash=await passwordHash(data.password,salt);user.passwordSalt=encode(salt);user.passwordHash=encode(hash);user.passwordAlgorithm='PBKDF2-SHA256';user.passwordIterations=150000;save('Initial owner password set')}catch{return showGate('Secure password setup is unavailable in this browser.')}}else if(!(await isCorrectPassword(user,data.password)))return showGate('Incorrect username or password.');audit('Sign In',`${user.username} signed in`);save();setActiveUser(user);gate.hidden=true;toast(`Signed in as ${user.name||user.username}`)};
  }
  function signOut(){closeModal();if(activeUser){audit('Sign Out',`${activeUser.username} signed out`);save()}localStorage.removeItem(sessionKey);activeUser=null;updateHeader();showGate('You have been signed out. Sign in to continue.');}
  function addSessionAccessAction(){
    const nav=$('#navigation'),auditLink=nav?.querySelector('a[data-page="audit"]');
    if(!nav)return;
    if(!$('#sessionSignOutAction')){
      const action=document.createElement('a');
      action.href='#';action.id='sessionSignOutAction';action.className='sessionSignOutAction';
      action.innerHTML=`${icon('logout')}<span>Sign Out</span>`;
      action.onclick=event=>{event.preventDefault();signOut()};
      nav.appendChild(action);
    }
  }
  const savedId=localStorage.getItem(sessionKey),savedUser=(db.users||[]).find(user=>user.id===savedId&&user.status!=='Inactive');
  activeUser=savedUser||null;
  window.BD_RECHECK_LOCAL_USER=()=>{
    if(!activeUser)return;
    const updated=db.users.find(user=>user.id===activeUser.id&&user.status!=='Inactive');
    if(updated){activeUser=updated;updateHeader();return}
    localStorage.removeItem(sessionKey);
    activeUser=null;
    updateHeader();
    showGate('This browser profile is no longer active.');
  };
  updateHeader();
  const renderBeforeSessionAccess=render;
  render=function(){
    if(activeUser&&page&&!canOpenModule(page)){const restrictedPage=page;page='dashboard';history.replaceState(null,'','#dashboard');toast(`${titles[restrictedPage]||'This module'} is restricted for your role.`)}
    const result=renderBeforeSessionAccess();lockRestrictedNavigation();lockRestrictedActions();addSessionAccessAction();return result
  };
  const goBeforeSessionAccess=go;
  go=function(key){if(!canOpenModule(key)){toast(`${titles[key]||'This module'} is restricted for your role.`);return}return goBeforeSessionAccess(key)};
  document.addEventListener('click',event=>{
    const action=event.target.closest('#content [data-page],#content [data-new],#content [data-edit],#content [data-delete],#content [data-receive],#content [data-invoice],#content [data-status],#content [data-action],#content [data-removeline],#content [data-removeoption],#modal [data-edit],#modal [data-delete],#modal [data-action]');if(!action)return;
    const target=actionTarget(action);if(!target||canPerform(target.key,target.permission,action))return;
    event.preventDefault();event.stopImmediatePropagation();toast(`${target.permission[0].toUpperCase()+target.permission.slice(1)} permission is not granted for ${titles[target.key]||'this module'}.`)
  },true);
  window.BD_HAS_MODULE_ACCESS=canOpenModule;window.BD_HAS_ACTION_PERMISSION=canPerform;
  addSessionAccessAction();
  if(!activeUser)showGate(savedId?'Your previous session is no longer active. Please sign in again.':'Sign in to open the BIKE DOCTOR workspace.');
})();
