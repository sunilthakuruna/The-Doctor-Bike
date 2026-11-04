/* Admin-only home for workspace backup, restore and fresh reset controls. */
(function(){
  const moduleId='backup-restore';
  const group=groups.find(([name])=>name==='SYSTEM & ACCESS');
  if(group&&!group[1].some(([key])=>key===moduleId))group[1].push([moduleId,'Backup & Restore','shield']);
  titles[moduleId]='Backup & Restore';
  const isAdmin=()=>{
    const id=localStorage.getItem('bike-doctor-active-user-v1');
    return !!id&&db.users.some(user=>user.id===id&&user.role==='Admin'&&user.status!=='Inactive');
  };
  async function checkCloud(panel){
    const status=panel.querySelector('.cloudProvisionStatus');
    try{
      const response=await fetch('/api/cloud-status',{cache:'no-store'});
      if(response.status===401){status.textContent='Owner sign-in required';return}
      const result=await response.json();
      if(!response.ok||result.connected!==true)throw new Error();
      status.textContent='Database reachable';
    }catch{status.textContent='Connection could not be verified'}
  }
  const previousRender=render;
  render=function(){
    if(page===moduleId){
      if(!isAdmin()){
        page='dashboard';history.replaceState(null,'','#dashboard');
        const result=previousRender();toast('Backup & Restore is available to Admin only.');return result;
      }
      page='settings';
      try{previousRender()}finally{page=moduleId}
      const content=$('#content');
      const panels=['.backupProtection','.backupScopeReset','#settingsRecoveryPanel'].map(selector=>content.querySelector(selector)).filter(Boolean);
      content.replaceChildren(...panels);
      const hint=document.createElement('p');
      hint.className='backupRestoreHint';
      hint.innerHTML='<strong>Complete backup:</strong> The file from “Download PC Backup Now” is restored with “Restore Backup”. <strong>Start Fresh:</strong> A complete backup must be downloaded and confirmed before business entries are cleared.';
      content.appendChild(hint);
      const cloudPanel=document.createElement('section');
      cloudPanel.className='panel cloudBackupProvision';
      cloudPanel.dataset.cloudBackupProvision='1';
      cloudPanel.innerHTML='<div class="panelhead"><h2>Cloud Database &amp; Hosting Information</h2></div><div class="panelbody"><div class="cloudProvisionGrid"><div><small>DATABASE PROVIDER</small><strong>Cloudflare D1</strong></div><div><small>APP URL</small><strong class="cloudAppUrl"></strong></div><div><small>DATABASE CONNECTION</small><strong class="cloudProvisionStatus" role="status">Checking…</strong></div></div><p class="cloudProvisionNote">This check confirms database access. Browser backup files contain the current workspace and may omit records that have not loaded or synced. Use Cloudflare D1 tools for database backup and recovery.</p></div>';
      cloudPanel.querySelector('.cloudAppUrl').textContent=location.origin;
      void checkCloud(cloudPanel);
      content.appendChild(cloudPanel);
      content.classList.add('backupRestorePage');
      $('#pageTitle').textContent=titles[moduleId];$('#crumb').textContent=titles[moduleId];
      $$('#navigation a[data-page]').forEach(link=>link.classList.toggle('active',link.dataset.page===moduleId));
      return;
    }
    const result=previousRender();
    const content=$('#content');content?.classList.remove('backupRestorePage');
    if(page==='settings'){
      content.querySelector('.backupProtection')?.remove();
      content.querySelector('.backupScopeReset')?.remove();
      content.querySelector('#settingsRecoveryPanel')?.remove();
    }
    return result;
  };
  render();
})();
