'use strict';
(function(){
  const recoveryKey=STORE+'-restore-points-v1';
  const recoveryLimit=5;
  const recoverySizeLimit=700000;
  let automaticPointWarning=false;
  const readPoints=()=>{try{const value=JSON.parse(localStorage.getItem(recoveryKey)||'[]');return Array.isArray(value)?value.filter(p=>p&&typeof p.state==='string'&&p.id):[]}catch{return[]}};
  const writePoint=(state,label,quiet)=>{
    if(typeof state!=='string'||!state.length||state.length>recoverySizeLimit){automaticPointWarning=true;if(!quiet)toast('This workspace is too large for an in-browser restore point. Download a database backup from Settings instead.');return false}
    let points=readPoints();
    if(points[0]?.state===state){automaticPointWarning=false;return true}
    points.unshift({id:'RP-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),at:new Date().toISOString(),label:String(label||'Before saved change').slice(0,72),state});
    points=points.slice(0,recoveryLimit);
    const fits=items=>JSON.stringify(items).length<=recoverySizeLimit;
    while(points.length>1&&!fits(points))points.pop();
    try{localStorage.setItem(recoveryKey,JSON.stringify(points));automaticPointWarning=false;return true}
    catch{
      try{localStorage.setItem(recoveryKey,JSON.stringify([points[0]]));automaticPointWarning=false;return true}
      catch{automaticPointWarning=true;if(!quiet)toast('The browser has no space for a restore point. Download a database backup from Settings.');return false}
    }
  };
  const createCurrentPoint=(label,quiet)=>{try{return writePoint(JSON.stringify(db),label||'Manual restore point',quiet)}catch{if(!quiet)toast('Could not create a restore point.');return false}};
  const saveBeforeRecoveryPoints=save;
  save=function(message){let previous=null;try{previous=localStorage.getItem(STORE)}catch{}if(previous){let next='';try{next=JSON.stringify(db)}catch{}if(next&&next!==previous)writePoint(previous,'Before '+String(message||'saved change').replace(/saved in this sample workspace/ig,'change').slice(0,55),true)}return saveBeforeRecoveryPoints(message)};
  const recoveryPanel=()=>{
    const points=readPoints();
    const status=automaticPointWarning?'<div class="notice" style="margin:12px 0;background:#fff7ed;color:#9a3412;border-color:#fed7aa">Automatic restore points could not be saved because this browser is low on storage. Download a database backup below before making more changes.</div>':'<div class="notice" style="margin:12px 0">A restore point is saved automatically before each data change. The latest five points stay in this browser. Download a database backup for a separate copy.</div>';
    const rows=points.length?points.map((p,i)=>`<div class="recovery-row" style="display:flex;gap:14px;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #e2e8f0"><div><strong>${esc(new Date(p.at).toLocaleString('en-GB'))}</strong><div style="color:#64748b;font-size:12px;margin-top:4px">${esc(p.label||'Restore point')} · ${i===0?'Most recent':'Earlier point'}</div></div><button type="button" class="btn secondary" data-restore-point="${esc(p.id)}">Restore this point</button></div>`).join(''):'<p id="noRestorePoints" style="color:#64748b">No restore points yet. Create one before making changes.</p>';
    return `<section class="panel" style="margin-top:18px"><div class="panelhead"><h2>Restore Points</h2><button type="button" class="btn secondary" id="createRestorePoint">Create Restore Point</button></div><div class="panelbody">${status}<div>${rows}</div><p style="font-size:11px;color:#64748b;margin-top:12px">Restore points only protect records saved in this browser. Use the database backup download for a separate file you can keep elsewhere.</p></div></section>`;
  };
  const settingsBeforeRecoveryPoints=settingsPage;
  settingsPage=function(){return settingsBeforeRecoveryPoints()+recoveryPanel()};
  const checkRestoreData=value=>value&&typeof value==='object'&&Array.isArray(value.customers)&&Array.isArray(value.bikes)&&Array.isArray(value.jobs)&&Array.isArray(value.parts)&&Array.isArray(value.services)&&Array.isArray(value.staff)&&value.settings&&typeof value.settings==='object';
  const restorePoint=id=>{
    const point=readPoints().find(p=>p.id===id);if(!point)return toast('That restore point is no longer available.');
    const when=new Date(point.at).toLocaleString('en-GB');
    openModal('Restore Point',`<div class="notice">Restore records from <strong>${esc(when)}</strong>? The current workspace will be saved as another restore point first.</div><p>This changes the data in this browser to the saved point.</p><div class="formactions"><button type="button" class="btn secondary" id="cancelPointRestore">Cancel</button><button type="button" class="btn" id="confirmPointRestore">Restore Point</button></div>`);
    $('#cancelPointRestore').onclick=closeModal;
    $('#confirmPointRestore').onclick=()=>{
      let restored;try{restored=JSON.parse(point.state)}catch{return toast('This restore point is damaged and cannot be used.')}
      if(!checkRestoreData(restored))return toast('This restore point does not contain a complete workspace.');
      let current;try{current=localStorage.getItem(STORE)}catch{}
      if(!current||!writePoint(current,'Before restoring '+when,false))return;
      db=restored;
      if(typeof audit==='function')audit('Restore Point','Workspace restored from '+when);
      if(save('Restore point applied')){closeModal();render()}
    };
  };
  document.addEventListener('click',e=>{
    const create=e.target.closest('#createRestorePoint');if(create){createCurrentPoint('Manual restore point',false);if(!automaticPointWarning){toast('Restore point created');render()}return}
    const restore=e.target.closest('[data-restore-point]');if(restore)restorePoint(restore.dataset.restorePoint);
  });
})();
