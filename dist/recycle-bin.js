/* Admin-only D1 recycle-bin list; no browser-only restoration of business records. */
(function(){
 let entries=[],state='idle',error='',busy=false,moduleFilter='';
 titles['recycle-bin']='Recycle Bin';
 const group=groups.find(group=>group[1].some(item=>item[0]==='backup-restore'))||groups.find(group=>group[0]==='SYSTEM & ACCESS')||groups.at(-1);
 for(const section of groups)section[1]=section[1].filter(item=>item[0]!=='recycle-bin');
 const backupIndex=group[1].findIndex(item=>item[0]==='backup-restore');
 group[1].splice(backupIndex<0?group[1].length:backupIndex+1,0,['recycle-bin','Recycle Bin','trash']);
 const labels={customers:'Customer Master',bikes:'Vehicle Master',services:'Service Master',staff:'Staff Master',expenses:'Expenses',accounts:'Account Master',parts:'Spare Parts',purchases:'Purchases',jobs:'Job Cards',sales:'Spare Parts Sales',receipts:'Payments',appointments:'Appointments',stockMovements:'Stock Movements',insurance:'Insurance',amcPlans:'AMC Plans',amcReminderLogs:'AMC Reminders',serviceReminderLogs:'Service Reminders',stockCounts:'Stock Verification'};
 async function load(){
  if(state==='loading')return;
  state='loading';error='';if(page==='recycle-bin')render();
  try{
   const response=await fetch('/api/recycle-bin',{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Array.isArray(result.data))throw Error(result.error||'Recycle Bin could not be loaded.');
   entries=result.data;state='ready';
  }catch(problem){state='error';error=problem.message;}
  if(page==='recycle-bin')render();
 }
 const basic=basicPage;
 basicPage=function(key){
  if(key!=='recycle-bin')return basic(key);
  const modules=[...new Set(entries.map(entry=>entry.collection))];
  const shown=entries.filter(entry=>(!moduleFilter||entry.collection===moduleFilter)&&[entry.label,entry.record_id,labels[entry.collection],entry.deleted_by].some(value=>String(value||'').toLowerCase().includes(search.toLowerCase())));
  return '<div class="notice">Admin only. Restore linked master records first, then dependent records. Restoration checks duplicate IDs, linked records and stock. Permanent Delete cannot be undone. This list contains records deleted after this feature was deployed, plus existing archived Job Cards and Sales.</div>'+
   '<div class="toolbar"><input id="search" class="search" type="search" placeholder="Search deleted records…" value="'+esc(search)+'"><select id="recycleModule" aria-label="Filter deleted module"><option value="">All Modules</option>'+modules.map(module=>'<option value="'+esc(module)+'" '+(module===moduleFilter?'selected':'')+'>'+esc(labels[module]||module)+'</option>').join('')+'</select><button type="button" class="btn secondary" id="refreshRecycle">Refresh</button></div>'+
   (error?'<p class="notice" role="alert">'+esc(error)+'</p>':'')+
   (state==='loading'?'<p role="status">Loading Recycle Bin…</p>':table(['Module','Record ID','Details','Deleted At','Deleted By','Actions'],shown.map(entry=>[
    esc(labels[entry.collection]||entry.collection),esc(entry.record_id),esc(entry.label),esc(typeof displayDateTime==='function'?displayDateTime(entry.deleted_at):entry.deleted_at),esc(entry.deleted_by),
    '<div class="rowactions"><button type="button" class="btn success small" data-recycle-action="restore" data-recycle-id="'+esc(entry.id)+'" '+(busy?'disabled':'')+'>Restore</button><button type="button" class="btn danger small" data-recycle-action="purge" data-recycle-id="'+esc(entry.id)+'" '+(busy?'disabled':'')+'>Permanently Delete</button></div>'
   ])));
 };
 const previousRender=render;
 render=function(){
  previousRender();
  if(page!=='recycle-bin')return;
  const filter=document.querySelector('#recycleModule');
  if(filter)filter.onchange=()=>{moduleFilter=filter.value;recordPageNumber=1;render()};
  const refresh=document.querySelector('#refreshRecycle');if(refresh)refresh.onclick=load;
  if(state==='idle')Promise.resolve().then(load);
 };
 document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-recycle-action]');if(!button||busy)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(!navigator.onLine){toast('Connect to the internet to restore or permanently delete records.');return}
  const action=button.dataset.recycleAction,id=button.dataset.recycleId,entry=entries.find(item=>item.id===id);
  if(!entry||!confirm((action==='purge'?'Permanently delete this archived entry? This cannot be undone: ':'Restore this record? Stock and balances may change: ')+entry.record_id))return;
  busy=true;render();
  try{
   const response=await fetch('/api/recycle-bin',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,action})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'The action could not be completed.');
   if(action==='restore'){location.reload();return}
   toast('Archived record permanently deleted.');await load();
  }catch(problem){toast(problem.message)}
  finally{busy=false;render()}
 },true);
 // Use the normal guarded delete flow; the server archives the successful deletion atomically.
 archiveBill=function(key,id){deleteRecord(key,id)};
 window.addEventListener('hashchange',()=>{if(location.hash==='#recycle-bin')load()});
 if(location.hash==='#recycle-bin')page='recycle-bin';
 render();
})();
