'use strict';
/* Settings-only recovery keeps current customers, jobs, inventory and payments intact. */
const settingsRecoveryKey=STORE+'-settings-restore-points-v1';
function readSettingsRestorePoints(){try{const value=JSON.parse(localStorage.getItem(settingsRecoveryKey)||'[]');return Array.isArray(value)?value.filter(item=>item&&item.id&&item.settings&&typeof item.settings==='object'):[]}catch{return[]}}
function writeSettingsRestorePoint(label='Manual settings restore point'){
  let points=readSettingsRestorePoints(),current=JSON.stringify(db.settings||{});
  if(points[0]?.state===current)return true;
  const point={id:'SRP-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),at:new Date().toISOString(),label:String(label).slice(0,72),settings:structuredClone(db.settings||{}),state:current};
  points.unshift(point);points=points.slice(0,5);
  try{localStorage.setItem(settingsRecoveryKey,JSON.stringify(points));return true}catch{return false}
}
function recoveryValue(value){if(value===null||value===undefined||value==='')return '—';if(typeof value==='string'&&value.startsWith('data:image/'))return 'Saved logo image';if(typeof value==='object'){try{return JSON.stringify(value)}catch{return '[saved value]'}}return String(value)}
function settingsRecoveryPanel(){
  const points=readSettingsRestorePoints();
  const history=points.length?points.map(point=>`<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid #e2e8f0"><span><strong>${esc(new Date(point.at).toLocaleString('en-GB'))}</strong><small style="display:block;color:#64748b">${esc(point.label)}</small></span><button type="button" class="btn secondary small" data-settings-restore-point="${esc(point.id)}">Restore settings</button></div>`).join(''):'<p style="color:#64748b">No earlier settings points are saved in this browser yet.</p>';
  return `<section class="panel" id="settingsRecoveryPanel" style="margin:0 0 18px"><div class="panelhead"><h2>Settings Recovery</h2></div><div class="panelbody"><p>Save or restore business settings without changing customer, vehicle, job, spare part, or payment records. You can also load settings from a database backup file and preview them first.</p><div class="toolbar"><button type="button" class="btn secondary" id="createSettingsRestorePoint">Save Current Settings Point</button><button type="button" class="btn" id="chooseSettingsBackup">Load Settings from Backup (JSON)</button><input type="file" id="settingsBackupFile" accept=".json,application/json" hidden></div><div id="settingsRestoreStatus" class="notice" style="margin-top:12px">${points.length?'Latest settings point is available below.':'No earlier point was available in this copy; the current settings point was saved when this recovery panel was added.'}</div><div style="margin-top:12px">${history}</div></div></section>`
}
const settingsPageBeforeRecovery=settingsPage;
settingsPage=function(){const html=settingsPageBeforeRecovery();return html.replace('<form id="settingsForm">',settingsRecoveryPanel()+'<form id="settingsForm">')};
function applySettingsRecovery(source,label){
  if(!source||typeof source!=='object'||Array.isArray(source))return toast('This backup has no readable business settings.');
  if(!writeSettingsRestorePoint('Before settings restore'))return toast('Could not save a settings restore point. Free browser storage and try again.');
  const before=structuredClone(db.settings||{});db.settings={...db.settings,...structuredClone(source)};audit('Restore','Business settings restored from '+label);
  if(save('Business settings restored')===false){db.settings=before;return}
  closeModal();render();toast('Business settings restored. Other records were preserved.');
}
function previewSettingsRecovery(settings,label){
  const keys=[...new Set([...Object.keys(db.settings||{}),...Object.keys(settings||{})])].filter(key=>JSON.stringify(db.settings?.[key])!==JSON.stringify(settings?.[key]));
  if(!keys.length)return toast('The backup settings already match the current settings.');
  const rows=keys.map(key=>`<tr><th style="text-align:left;padding:6px">${esc(key)}</th><td style="padding:6px">${esc(recoveryValue(db.settings?.[key]))}</td><td style="padding:6px">${esc(recoveryValue(settings?.[key]))}</td></tr>`).join('');
  openModal('Review Settings Restore',`<div class="formbody"><div class="notice">Only Business Settings will be restored from <strong>${esc(label)}</strong>. Customer, vehicle, job, spare part, inventory, and payment records will remain as they are.</div><div class="tablewrap" style="max-height:360px;overflow:auto"><table><thead><tr><th>Setting</th><th>Current</th><th>From backup</th></tr></thead><tbody>${rows}</tbody></table></div></div><div class="formactions">${btn('Cancel','cancel','secondary')}<button type="button" class="btn" id="confirmSettingsRestore">Restore These Settings</button></div>`);
  $('#confirmSettingsRestore').onclick=()=>applySettingsRecovery(settings,label);
}
document.addEventListener('click',async event=>{
  if(event.target.closest('#createSettingsRestorePoint')){if(!writeSettingsRestorePoint('Manual settings restore point'))return toast('Could not save a settings restore point. Free browser storage and try again.');toast('Current settings restore point saved.');render();return}
  if(event.target.closest('#chooseSettingsBackup')){$('#settingsBackupFile')?.click();return}
  const restore=event.target.closest('[data-settings-restore-point]');if(restore){const point=readSettingsRestorePoints().find(item=>item.id===restore.dataset.settingsRestorePoint);if(!point)return toast('That settings restore point is no longer available.');return previewSettingsRecovery(point.settings,point.label)}
});
document.addEventListener('change',async event=>{
  const input=event.target.closest('#settingsBackupFile');if(!input?.files?.[0])return;const file=input.files[0];input.value='';if(file.size>15*1024*1024)return toast('Backup exceeds 15 MB.');
  try{const data=validateBackup(await file.text());previewSettingsRecovery(data.settings,file.name)}catch(error){toast('Could not read settings from this backup: '+error.message)}
});
writeSettingsRestorePoint('Settings before recovery panel');

render();
