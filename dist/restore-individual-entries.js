/* Restore selected records from a complete workspace backup without replacing configuration. */
(function(){
  const labels={customers:'Customers',bikes:'Vehicles',services:'Services',staff:'Staff',parts:'Spare Parts',jobs:'Job Cards',sales:'Counter Sales',purchases:'Purchases',receipts:'Receipts',expenses:'Expenses',appointments:'Appointments',insurance:'Insurance',accounts:'Accounts',audit:'Audit Logs'};
  const keys=Object.keys(labels);
  const copy=value=>JSON.parse(JSON.stringify(value));
  const title=row=>row?.name||row?.supplier||row?.id||'Unnamed entry';
  function addButton(){
    const actions=$('.backupProtection .panelbody');if(!actions||actions.querySelector('#restoreIndividualEntries'))return;
    const button=document.createElement('button');button.type='button';button.className='btn secondary small';button.id='restoreIndividualEntries';button.textContent='Restore Individual Entries';button.onclick=()=>$('#restoreIndividualFile').click();
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';input.id='restoreIndividualFile';input.hidden=true;input.onchange=()=>{const file=input.files?.[0];input.value='';if(file)readBackup(file)};
    const restoreToolbar=actions.querySelector('#backupRestoreNow')?.parentElement;
    if(!restoreToolbar)return;
    restoreToolbar.append(button);actions.append(input);
  }
  function readBackup(file){
    file.text().then(text=>{
      const source=JSON.parse(text);if(source?.format!=='BIKE_DOCTOR_COMPLETE_WORKSPACE_BACKUP'||!source.workspace)throw Error('Choose a complete BIKE DOCTOR workspace backup file.');
      const workspace=source.workspace;openPicker(workspace,file.name);
    }).catch(error=>toast('Backup rejected: '+error.message));
  }
  function openPicker(workspace,fileName){
    const available=keys.filter(key=>Array.isArray(workspace[key])&&workspace[key].length);
    openModal('Restore Individual Entries',`<div class="formbody individualRestore"><div class="notice">Choose records from <strong>${esc(fileName)}</strong>. Existing IDs will not be overwritten. Settings, users, permissions, lists and GST configuration will not be replaced.</div><label class="field"><span>Module</span><select id="individualRestoreModule">${available.map(key=>`<option value="${key}">${esc(labels[key])} (${workspace[key].length})</option>`).join('')}</select></label><div id="individualRestoreRecords" class="individualRestoreRecords"></div></div><div class="formactions">${btn('Cancel','cancel','secondary')}<button type="button" class="btn" id="individualRestoreConfirm">Restore Selected Records</button></div>`);
    const moduleSelect=$('#individualRestoreModule'),recordsBox=$('#individualRestoreRecords');
    const renderRecords=()=>{const rows=workspace[moduleSelect.value]||[];recordsBox.innerHTML=rows.map((row,index)=>`<label><input type="checkbox" class="individualRestoreItem" value="${index}"> <span>${esc(title(row))}</span><small>${esc(row.id||'')}</small></label>`).join('')||'<p>No records available.</p>'};
    moduleSelect.onchange=renderRecords;renderRecords();
    $('#individualRestoreConfirm').onclick=()=>{const key=moduleSelect.value,selected=[...document.querySelectorAll('.individualRestoreItem:checked')].map(input=>workspace[key][Number(input.value)]);if(!selected.length)return toast('Select at least one record.');const previous=db;try{const existing=new Set((db[key]||[]).map(row=>row.id));const additions=selected.filter(row=>!row.id||!existing.has(row.id));if(!additions.length)return toast('All selected records already exist.');db[key]=[...(db[key]||[]),...copy(additions)];validateBackup({format:'BIKE_DOCTOR_BACKUP',data:db});if(save('Selected records restored from complete backup')===false){db=previous;return}closeModal();render();toast(`${additions.length} ${labels[key]} restored. Existing IDs were kept.`)}catch(error){db=previous;toast('Restore cancelled: '+error.message)}};
  }
  const previousRender=render;render=function(){const result=previousRender();if(page==='backup-restore')addButton();return result};render();
})();
