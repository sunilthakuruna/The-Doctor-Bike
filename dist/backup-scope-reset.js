/* Optional record export and a deliberate, complete-backup-first fresh reset. */
(function(){
  const labels={customers:'Customers',bikes:'Vehicles',services:'Services',staff:'Staff',parts:'Spare parts',jobs:'Job cards',sales:'Counter sales',purchases:'Purchases',receipts:'Receipts',expenses:'Expenses',appointments:'Appointments',insurance:'Insurance',accounts:'Accounts',audit:'Audit history',stockMovements:'Stock movements',amcPlans:'AMC plans'};
  const groups=()=>freshWorkspaceRecordCollections().map(([key,rows])=>[key,rows]);
    const panel=()=>`<section class="panel backupScopeReset"><div class="panelhead"><h2>Fresh Reset Protection</h2><span class="badge danger">Warning</span></div><div class="panelbody"><p>Back Up Everything &amp; Start Fresh clears business records only. Settings, lists, users and permissions remain.</p><div class="backupScopeActions"><button type="button" class="btn danger small" id="backupStartFresh">Back Up Everything &amp; Start Fresh</button></div><p class="backupScopeFootnote">A complete backup and confirmation are required before any records are cleared.</p></div></section>`;
  const originalRender=render;
  render=function(){
    originalRender();if(page!=='settings')return;
    const backup=$('.backupProtection');if(!backup)return;
    backup.insertAdjacentHTML('afterend',panel());
    $('#backupStartFresh').onclick=reviewSafeFreshReset;
  };
  function reviewSelectedReset(){
    const selected=[...document.querySelectorAll('.backupScopeItem:checked')].map(input=>input.value);
    if(!selected.length)return toast('Select at least one entry group to clear.');
    const entries=selected.map(key=>[key,db[key]||[]]),total=entries.reduce((sum,[,rows])=>sum+rows.length,0);
    if(!total)return toast('The selected entry groups are already empty.');
    openModal('Back Up Selected Entries Before Reset',`<div class="formbody freshResetReview"><div class="notice"><strong>${total} selected records will be cleared.</strong> Unselected modules, settings, lists, users and permissions will remain.</div><p>Download a complete restorable backup first. Then confirm that it is saved and type <strong>RESET SELECTED</strong>.</p><p>${entries.map(([key,rows])=>`${esc(labels[key]||key)}: ${rows.length}`).join(' · ')}</p><button type="button" class="btn secondary" id="selectedResetDownload">Download Complete Backup</button><p id="selectedResetStatus" class="freshBackupStatus">Backup not downloaded yet.</p><p><label><input type="checkbox" id="selectedResetBackupSaved" disabled> I saved and checked the backup file.</label></p><input type="text" id="selectedResetWord" placeholder="Type RESET SELECTED" autocomplete="off"></div><div class="formactions">${btn('Cancel','cancel','secondary')}<button type="button" class="btn danger" id="selectedResetConfirm" disabled>Clear Selected Entries</button></div>`);
    let backupStarted=false;
    const ready=()=>$('#selectedResetConfirm').disabled=!(backupStarted&&$('#selectedResetBackupSaved').checked&&$('#selectedResetWord').value.trim()==='RESET SELECTED');
    $('#selectedResetDownload').onclick=()=>{try{if(typeof downloadBackup!=='function')throw Error('Complete backup service is unavailable.');downloadBackup();backupStarted=true;$('#selectedResetBackupSaved').disabled=false;$('#selectedResetStatus').textContent='Backup download started. Save and check the file before continuing.';$('#selectedResetStatus').classList.add('confirmed');ready()}catch(error){toast(error.message||'Complete backup could not be downloaded. No records were cleared.')}};
    $('#selectedResetBackupSaved').onchange=ready;$('#selectedResetWord').oninput=ready;
    $('#selectedResetConfirm').onclick=()=>{ready();if($('#selectedResetConfirm').disabled)return;const previous=structuredClone(db);try{for(const key of selected)db[key]=[];if(selected.includes('attendance'))db.attendance={};db.importInfo={source:'selected-reset',clearedAt:new Date().toISOString(),selection:selected};if(save('Selected entry groups cleared after complete backup confirmation')===false){db=previous;return toast('Could not save the selected reset. Your records were kept.')}closeModal();render();toast('Selected entry groups cleared. Unselected data and settings were kept.')}catch(error){db=previous;toast(error.message||'Could not clear selected entries. Existing records were kept.')}};
  }
  function reviewSafeFreshReset(){
    const {entries,total}=freshWorkspaceSummary();
    if(!total)return toast('There are no saved business records to clear.');
    openModal('Back Up Everything Before Fresh Reset',`<div class="formbody freshResetReview"><div class="notice"><strong>${total} saved records will be cleared.</strong> Settings, lists, user accounts and permissions remain.</div><p>First download a complete restorable backup. Check that the file is safely stored, then type <strong>RESET</strong> below. A selected-entry export only restores its selected groups.</p><p>${entries.map(([key,rows])=>`${esc(labels[key]||key)}: ${rows.length}`).join(' · ')}</p><button type="button" class="btn secondary" id="freshDownloadFull">Download Complete Backup</button><p id="freshBackupStatus" class="freshBackupStatus">Backup not downloaded yet.</p><p><label><input type="checkbox" id="freshBackupSaved" disabled> I saved and checked the complete backup file.</label></p><input type="text" id="freshResetWord" placeholder="Type RESET" autocomplete="off"></div><div class="formactions">${btn('Cancel','cancel','secondary')}<button type="button" class="btn danger" id="freshConfirmClear" disabled>Clear Business Entries</button></div>`);
    let backupStarted=false;
    const ready=()=>$('#freshConfirmClear').disabled=!(backupStarted&&$('#freshBackupSaved').checked&&$('#freshResetWord').value.trim()==='RESET');
    $('#freshDownloadFull').onclick=()=>{
      try{if(typeof downloadBackup!=='function')throw Error('Complete backup service is unavailable.');downloadBackup();backupStarted=true;$('#freshBackupSaved').disabled=false;$('#freshBackupStatus').textContent='Backup download started. Save and check the file before continuing.';$('#freshBackupStatus').classList.add('confirmed');ready()}catch(error){$('#freshBackupStatus').textContent='Backup failed. No records were cleared.';toast(error.message||'Complete backup could not be downloaded. No records were cleared.')}
    };
    $('#freshBackupSaved').onchange=ready;$('#freshResetWord').oninput=ready;
    $('#freshConfirmClear').onclick=()=>{
      ready();if($('#freshConfirmClear').disabled)return;
      const previous=db;
      try{
        const cleared=structuredClone(db);
        for(const [key] of groups())cleared[key]=[];
        cleared.attendance={};delete cleared.sampleDataInfo;
        cleared.importInfo={source:'fresh-workspace',clearedAt:new Date().toISOString()};
        db=cleared;
        if(save()===false){db=previous;return toast('Could not save the fresh workspace. Your records were kept.')}
        closeModal();page='dashboard';search='';filter='';render();toast('Fresh workspace ready. Settings and user access were kept.');
      }catch(error){db=previous;toast(error.message||'Could not clear records. Existing records were kept.')}
    };
  }
  render();
})();
