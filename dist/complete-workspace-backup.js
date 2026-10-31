/* Complete workspace backup. Keeps all saved module data and configuration, never an active sign-in session. */
(function(){
  const legacyValidateBackup=validateBackup;
  const activeSessionKey='bike-doctor-active-user-v1';
  const jsonCopy=value=>JSON.parse(JSON.stringify(value));
  const safeCopy=value=>JSON.parse(JSON.stringify(value,(key,item)=>['__proto__','constructor','prototype'].includes(key)?undefined:item));
  const recordGroups=['customers','bikes','services','staff','parts','jobs','sales','purchases','receipts','expenses','appointments','insurance','accounts','users','audit'];
  const protectedModules=['dashboard','settings','lists','customers','bikes','insurance','staff','attendance','payroll','services','accounts','appointments','jobs','parts','godown','sales','purchases','service-reminders','amc-plans','payments','reports','expenses','users','audit','report-sales','report-purchases','report-gst','report-dues','report-profit','report-collection','report-stock','report-vendor-purchases','backup-restore'];
  const countSummary=data=>recordGroups.map(key=>[key.replace(/s$/,''),Array.isArray(data[key])?data[key].length:0]);

  backupObject=function(){
    return {
      format:'BIKE_DOCTOR_COMPLETE_WORKSPACE_BACKUP',
      version:3,
      createdAt:new Date().toISOString(),
      application:'BIKE DOCTOR Garage Management System',
      scope:'Complete saved workspace: every module, business settings, lists, records, attachments, permissions and audit history.',
      securityNote:'The active sign-in session is deliberately excluded. Sign in again after restoring.',
      workspace:jsonCopy(db),
      browserConfiguration:{googleDriveClientId:localStorage.getItem(STORE+'-drive-client')||''},
      moduleCoverage:protectedModules,
      coverageStatus:`${protectedModules.length} of ${protectedModules.length} modules included`,
      moduleCounts:Object.fromEntries(countSummary(db))
    };
  };

  downloadBackup=function(){
    const data=backupObject();
    download(JSON.stringify(data,null,2),`BIKE-DOCTOR-complete-workspace-${today()}-${Date.now()}.json`,'application/json');
    localStorage.setItem(STORE+'-last-download',new Date().toISOString());
    toast('Complete workspace backup downloaded. Keep this file in Google Drive and one Office PC or external-drive location.');
  };

  validateBackup=function(text){
    const source=typeof text==='string'?JSON.parse(text):text;
    const isComplete=source?.format==='BIKE_DOCTOR_COMPLETE_WORKSPACE_BACKUP'&&source.version>=3;
    const workspace=isComplete?source.workspace:(source?.format==='BIKE_DOCTOR_BACKUP'?source.data:source);
    if(!workspace||typeof workspace!=='object')throw Error('This is not a BIKE DOCTOR workspace backup.');
    if(isComplete){
      const covered=Array.isArray(source.moduleCoverage)?new Set(source.moduleCoverage):new Set();
      const missing=protectedModules.filter(module=>!covered.has(module));
      if(missing.length)throw Error(`Complete backup coverage check failed: ${missing.join(', ')} missing.`);
    }
    /* Run the established record validation first, then retain the safe user-access configuration that the old export omitted. */
    const clean=legacyValidateBackup({format:'BIKE_DOCTOR_BACKUP',data:workspace});
    if(!isComplete)return {workspace:clean,complete:false,createdAt:source?.createdAt||null,moduleCounts:source?.moduleCounts||null};
    /* The legacy validator has checked every record and ID. Use a prototype-safe copy of the original only so no saved field is silently lost. */
    const completeWorkspace=safeCopy(workspace);
    completeWorkspace.settings=safeCopy(workspace.settings||{});
    completeWorkspace.lists=safeCopy(workspace.lists||clean.lists);
    completeWorkspace.attendance=safeCopy(workspace.attendance||{});
    return {workspace:completeWorkspace,complete:true,createdAt:source?.createdAt||null,moduleCounts:source?.moduleCounts||null,browserConfiguration:source?.browserConfiguration||{}};
  };

  confirmRestore=function(payload){
    const isPayload=payload&&payload.workspace;
    const workspace=isPayload?payload.workspace:payload;
    const complete=!!isPayload&&payload.complete;
    const counts=countSummary(workspace);
    openModal('Review Complete Backup Before Restoring',`<div class="formbody"><div class="notice"><strong>${complete?'Complete workspace backup detected.':'Legacy business backup detected.'}</strong> Restoring replaces the saved workspace in this browser. A complete safety copy of the current workspace will download first.</div>${summary([['MODULE DATA',counts.reduce((total,[,count])=>total+count,0)],['CUSTOMERS',workspace.customers.length],['VEHICLES',workspace.bikes.length],['JOB CARDS',workspace.jobs.length],['PARTS',workspace.parts.length],['USERS & RIGHTS',workspace.users.length]])}<p><strong>Included:</strong> all module records, stock, transactions, settings, lists, invoice layout, uploaded logo/payment images, user permissions and audit history.</p><p><strong>Security:</strong> the active sign-in session is not restored; sign in again after recovery.</p><p>Garage: <strong>${esc(workspace.settings.name||'BIKE DOCTOR')}</strong></p></div><div class="formactions">${btn('Cancel','cancel','secondary')}<button class="btn danger" id="confirmCompleteRestore">Download Safety Copy & Restore Everything</button></div>`);
    $('#confirmCompleteRestore').onclick=()=>{
      downloadBackup();
      db=workspace;
      const clientId=payload?.browserConfiguration?.googleDriveClientId;
      if(typeof clientId==='string'&&/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(clientId))localStorage.setItem(STORE+'-drive-client',clientId);
      localStorage.removeItem(activeSessionKey);
      if(!save())return toast('Restore could not be saved because browser storage is full.');
      closeModal();
      toast('Complete workspace restored. Reloading the application…');
      setTimeout(()=>location.reload(),350);
    };
  };

  const renderBeforeCompleteWorkspaceBackup=render;
  render=function(){
    renderBeforeCompleteWorkspaceBackup();
    if(page!=='settings')return;
    const panel=$('.backupProtection .panelbody');
    if(panel){
      const intro=panel.querySelector(':scope > p');
      if(intro)intro.textContent='Complete protection for every saved module, its records, stock, settings, invoice design, uploaded images, user rights and audit history.';
      if(!panel.querySelector('.completeBackupCoverage'))intro?.insertAdjacentHTML('afterend',`<div class="notice completeBackupCoverage"><strong>Coverage verified: ${protectedModules.length} of ${protectedModules.length} modules.</strong> Each backup includes all saved entries and configuration for dashboard, masters, operations, finance, reports, users and audit logs. Restore files without this complete coverage are rejected.</div>`);
    }
    const input=$('#backupRestoreFile');
    if(input&&!input.dataset.completeWorkspaceRestore){
      const fresh=input.cloneNode(true);fresh.dataset.completeWorkspaceRestore='true';input.replaceWith(fresh);
      fresh.addEventListener('change',async event=>{
        const file=event.target.files?.[0];if(!file)return;
        if(file.size>25*1024*1024)return toast('Backup exceeds 25 MB. Use a smaller complete workspace backup.');
        try{confirmRestore(validateBackup(await file.text()))}catch(error){toast('Restore rejected: '+error.message)}
      });
    }
  };
  render();
})();
