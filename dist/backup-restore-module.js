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
      cloudPanel.innerHTML='<div class="panelhead"><h2>Cloud Database &amp; Hosting Information</h2><span class="cloudProvisionBadge">Configuration only</span></div><div class="panelbody"><p class="cloudProvisionIntro">This prototype currently stores records in this browser. The cloud connection is intentionally not active yet and can be configured after the application is deployed.</p><div class="cloudProvisionGrid"><div><small>DATABASE PROVIDER</small><strong>Not configured</strong></div><div><small>FIREBASE PROJECT ID</small><strong>Not configured</strong></div><div><small>REALTIME DATABASE URL</small><strong>Not configured</strong></div><div><small>HOSTING URL</small><strong>Not configured</strong></div><div><small>STORAGE BUCKET</small><strong>Not configured</strong></div><div><small>SYNC STATUS</small><strong class="cloudProvisionStatus">Offline / Local Browser Storage</strong></div></div><p class="cloudProvisionNote">After deployment, connect your own Firebase project, authentication, secure database rules and hosting details before enabling live cloud backup and restore.</p></div>';
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
