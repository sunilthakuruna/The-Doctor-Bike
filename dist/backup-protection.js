/* One backup centre for Drive, the Office PC and restore operations. */
function backupPolicy(){return {...{frequency:'daily',google:true,office:true},...(db.settings.backupPolicy||{})}}
function backupProtectionPanel(){
  const policy=backupPolicy(),drive=(()=>{try{return JSON.parse(localStorage.getItem(STORE+'-last-drive')||'null')}catch{return null}})(),office=localStorage.getItem(STORE+'-last-download'),client=localStorage.getItem(STORE+'-drive-client')||'';
  const when=value=>value?new Date(value).toLocaleString('en-GB'):'Not yet created';
  return `<section class="panel backupProtection"><div class="panelhead"><h2>${icon('shield')}Backup Protection</h2><span class="badge info">Manual backup tools</span></div><div class="panelbody"><p>Use the buttons below to create a complete browser-workspace backup to Google Drive or download a JSON copy for the Office PC or external drive.</p><form id="backupPolicyForm"><div class="backupProtectionGrid"><section><h3>Google Drive — Web Backup</h3><p>Use after the application is hosted online. The approved Google account keeps the cloud copy.</p><label class="backupToggle"><input name="google" type="checkbox" ${policy.google?'checked':''}> Include Google Drive in the backup plan</label><label class="field"><span>GOOGLE OAUTH WEB CLIENT ID</span><input name="clientId" placeholder="…apps.googleusercontent.com" value="${esc(client)}"></label><p class="backupStatus">Last Drive backup: <strong>${esc(drive?.name||when(drive?.date))}</strong></p><div class="toolbar"><button type="button" class="btn success small" id="backupDriveNow">Back Up to Google Drive Now</button><a class="btn secondary small" href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener">Open Google Drive ↗</a></div></section><section><h3>Office PC / External Drive Copy</h3><p>Downloads a complete JSON backup. Save it to a selected office folder, external drive, or an approved synced Drive folder.</p><label class="backupToggle"><input name="office" type="checkbox" ${policy.office?'checked':''}> Include Office PC copy in the backup plan</label><p class="backupStatus">Last PC backup: <strong>${esc(when(office))}</strong></p><div class="toolbar"><button type="button" class="btn secondary small" id="backupOfficeNow">Download PC Backup Now</button><button type="button" class="btn secondary small" id="backupRestoreNow">Restore Backup</button></div><input type="file" id="backupRestoreFile" accept=".json,application/json" hidden></section></div><div class="backupSchedule"><label class="field"><span>PLANNED BACKUP FREQUENCY (REMINDER ONLY)</span><select name="frequency"><option value="every-save" ${policy.frequency==='every-save'?'selected':''}>After important saves</option><option value="daily" ${policy.frequency==='daily'?'selected':''}>Daily</option><option value="weekly" ${policy.frequency==='weekly'?'selected':''}>Weekly</option></select></label><button type="submit" class="btn small">Save Backup Preference</button></div></form><div class="notice"><strong>Important:</strong> backups are manual in this browser prototype. The frequency choice is saved as a preference only; it does not schedule a reminder or run a backup. Google Drive backup requires the hosted app to be open and connected. Unattended backups require a secure server-side service.</div></div></section>`;
}
const settingsBeforeBackupProtection=settingsPage;
settingsPage=function(){
  const html=settingsBeforeBackupProtection();
  const withoutBackupPanel=html.replace(/<section class="panel"[^>]*><div class="panelhead"><h2>(?:(?!<\/h2>)[\s\S])*?Database Backup & Google Drive[\s\S]*?<\/section>/,'');
  return withoutBackupPanel.replace(/<button[^>]*>(?:(?!<\/button>)[\s\S])*?Download Database Backup(?:(?!<\/button>)[\s\S])*?<\/button>/,'')+backupProtectionPanel();
};
const renderBeforeBackupProtection=render;
render=function(){
  renderBeforeBackupProtection();
  if(page!=='settings')return;
  const form=$('#backupPolicyForm');
  if(form)form.onsubmit=event=>{
    event.preventDefault();
    const values=new FormData(form),client=String(values.get('clientId')||'').trim();
    if(client&&!/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(client))return toast('Enter the public Google OAuth web client ID, not a password or secret.');
    localStorage.setItem(STORE+'-drive-client',client);
    db.settings.backupPolicy={frequency:values.get('frequency'),google:form.elements.google.checked,office:form.elements.office.checked};
    save('Backup protection plan saved');render();
  };
  $('#backupOfficeNow')?.addEventListener('click',()=>downloadBackup());
  $('#backupRestoreNow')?.addEventListener('click',()=>$('#backupRestoreFile')?.click());
  $('#backupRestoreFile')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    if(file.size>15*1024*1024)return toast('Backup exceeds 15 MB.');
    try{confirmRestore(validateBackup(await file.text()))}catch(error){toast('Restore rejected: '+error.message)}
  });
  $('#backupDriveNow')?.addEventListener('click',()=>{
    if(location.protocol==='file:')return toast('Google Drive backup needs the hosted web application. Download the Office PC backup for now.');
    backUpToDrive();
  });
};
render();
