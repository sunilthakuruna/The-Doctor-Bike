const cloudRecordRefreshers=[];
const dirtyCloudForms=new WeakSet();
document.addEventListener('input',event=>{const form=event.target.closest?.('#content form');if(form)dirtyCloudForms.add(form)},true);
document.addEventListener('change',event=>{const form=event.target.closest?.('#content form');if(form)dirtyCloudForms.add(form)},true);
const canRefreshCloudRecords=()=>{
 if(document.visibilityState!=='visible'||!document.querySelector('#modal').hidden||
  document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')||
  [...document.querySelectorAll('#content form')].some(form=>dirtyCloudForms.has(form)))return false;
 if(typeof attendanceDailyDrafts!=='undefined'&&Object.entries(attendanceDailyDrafts).some(([day,records])=>JSON.stringify(records)!==JSON.stringify(db.attendance?.[day]||{})))return false;
 if(page==='report-stock'&&typeof stockSheet!=='undefined'&&stockSheet&&typeof stockSheetView!=='undefined'&&!stockSheetView&&stockSheet.lines.some(line=>line.note||[line.physical,line.mainPhysical,line.godownPhysical].some(value=>value!=null)))return false;
 return true;
};

function connectCloudRecords(scope,label,collections,adapter){
 if(scope==='user-permissions')return; // Server user records now own these profiles.
 let pendingKey=STORE+'-'+scope+'-pending-v1';
 const snapshot=()=>JSON.stringify(adapter?adapter.read():Object.fromEntries(collections.map(key=>[key,db[key]||[]])));
 const apply=data=>{
  if(adapter)return adapter.apply(data);
  for(const key of collections)db[key]=data[key];
  if(scope==='inventory'&&typeof stockSheet!=='undefined'&&stockSheet&&
     !stockSheet.lines.some(line=>line.note||[line.physical,line.mainPhysical,line.godownPhysical].some(value=>value!=null))){
   stockSheet=null;
  }
 };
 const banner=document.createElement('div');
 banner.className='notice';
 banner.hidden=true;
 document.querySelector('#content').before(banner);
 const show=(message,action,label)=>{
  banner.replaceChildren(document.createTextNode(message));
  if(action){
   const button=document.createElement('button');
   button.type='button';
   button.className='btn small';
   button.textContent=label;
   button.onclick=action;
   banner.append(' ',button);
  }
  banner.hidden=!message;
 };
 let baseline=snapshot(),version=null,ready=false,pending=null,busy=false,conflict=false;
 let generation=0,accessSignature=null;
 let largeSave=false;
 const saveWorkspace=save;

 function showConflict(){
  show(label+' changed in another browser. Your unsynced changes are still saved on this device.',()=>{
   download(JSON.stringify(pending,null,2),scope+'-unsynced.json','application/json');
   show('Keep the downloaded copy for review. Reload to use the latest cloud records.',()=>{
    localStorage.removeItem(pendingKey);
    location.reload();
   },'Reload cloud records');
  },'Download unsynced changes');
 }

 async function sync(){
  if(!ready||busy||conflict||!pending)return;
  if(navigator.onLine===false&&!window.BD_OPEN_OFFLINE_WORK){
   show(label+' changes are waiting for a connection. They will retry when this app reconnects.');
   return;
  }
  busy=true;
  const sent=pending;
  try{
   const response=await fetch('/api/'+scope,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({version,data:sent.data})});
   const result=await response.json();
   if(response.status===409){conflict=true;showConflict();return}
   if(!response.ok||!result.version)throw new Error(result.error||label+' sync failed.');
   version=result.version;
   if(scope==='inventory')window.payrollCloudSources.inventory='ready';
   if(pending===sent){
    localStorage.removeItem(pendingKey);
    pending=null;
    show('');
    toast(label+' saved to Cloudflare D1.');
   }else{
    pending.version=version;
    localStorage.setItem(pendingKey,JSON.stringify(pending));
   }
  }catch(error){
   show(error.message+' Your changes are saved on this device and are waiting to sync.',sync,'Retry sync');
   return;
  }finally{busy=false}
  if(pending)void sync();
 }

 window.addEventListener('online',()=>{void sync()});
 setInterval(()=>{if(document.visibilityState==='visible')void sync()},15000);

 save=function(message){
  if(largeSave){toast('Please wait while settings are being saved.');return false}
  const current=snapshot();
  if(current===baseline)return saveWorkspace(message);
  if(!ready||conflict){
   toast('Cloud '+label.toLowerCase()+' is unavailable. Reload before changing records.');
   return false;
  }
  const stored=localStorage.getItem(pendingKey);
  if(stored&&stored!==JSON.stringify(pending)){
   toast('Another tab has pending changes. Sync or review that tab before saving here.');return false;
  }
  const previous=pending;
  const next={version,data:JSON.parse(current)};
  window.BD_LAST_SAVE_ERROR=null;
  try{
   localStorage.setItem(pendingKey,JSON.stringify(next));
   if(saveWorkspace()===false)throw new Error();
  }catch(error){
   try{if(previous)localStorage.setItem(pendingKey,JSON.stringify(previous));else localStorage.removeItem(pendingKey)}catch{}
   const failure=window.BD_LAST_SAVE_ERROR||error;
   const quota=['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(failure?.name)||failure?.code===22||failure?.code===1014;
   if(scope==='business-settings'&&quota&&typeof window.BD_QUEUE_CLOUD_CHANGE==='function'&&!previous&&!busy){
    largeSave=true;show('Saving settings securely on this device. Please keep this page open.');
    const content=document.querySelector('#content'),wasInert=content.inert;
    content.inert=true;
    const before=baseline,preventClose=event=>{event.preventDefault();event.returnValue=''};
    window.addEventListener('beforeunload',preventClose);
    void (async()=>{
     try{
      const stored=await window.BD_QUEUE_CLOUD_CHANGE(scope,next),result=await stored.json();
      version=result.version;
      baseline=current;generation++;pending=null;
      show('Settings saved on this device. Cloud delivery is tracked in the sync status above.');
      toast('Settings saved in device storage; queued for cloud sync.');
     }catch(storageError){
      apply(JSON.parse(before));
      show('Settings were not saved: '+(storageError.message||'device storage is unavailable')+'. Your previous settings were kept.');
      toast('Settings could not be saved. Previous settings restored.');
      if(page==='settings')render();
     }finally{largeSave=false;content.inert=wasInert;window.removeEventListener('beforeunload',preventClose)}
    })();
    return true;
   }
   toast(label+' was not saved. '+(quota?'Device storage is full.':failure?.message||'Check the earlier save error and try again.'));
   return false;
  }
  baseline=current;
  generation++;
  pending=next;
  show(label+' changes are waiting to sync.');
  void sync();
  return true;
 };

 cloudRecordRefreshers.push(async()=>{
  if(!ready||busy||pending||conflict||window.BD_OFFLINE_SESSION||navigator.onLine===false||snapshot()!==baseline||!canRefreshCloudRecords())return false;
  const started=generation;
  const response=await fetch('/api/'+scope+(version?'?version='+encodeURIComponent(version):''),{cache:'no-store'});
  if(response.status===304||!response.ok)return false;
  const result=await response.json();
  if(!result.data||typeof result.version!=='string'||(result.version===version&&(result.access??null)===accessSignature)||
     started!==generation||busy||pending||conflict||snapshot()!==baseline||!canRefreshCloudRecords())return false;
  apply(result.data);
  accessSignature=result.access??null;
  version=result.version;
  if(scope==='inventory')window.payrollCloudSources.inventory='ready';
  baseline=snapshot();
  return true;
 });

 (async()=>{
  if(!await window.BD_CLOUD_READY)return;
  pendingKey=STORE+'-'+scope+'-pending-v2-'+encodeURIComponent(localStorage.getItem('bike-doctor-active-user-v1')||'');
  try{
   const response=await fetch('/api/'+scope,{cache:'no-store'});
   if(response.status===403){
    show('');
    if(!adapter)for(const key of collections)db[key]=[];
    if(scope==='inventory')window.payrollCloudSources.inventory='unavailable';
    baseline=snapshot();
    return;
   }
   const result=await response.json();
   if(!response.ok||!Object.hasOwn(result,'version'))throw new Error();
   accessSignature=result.access??null;
   pending=JSON.parse(localStorage.getItem(pendingKey)||'null');
   version=result.version;
   if(result.data)apply(result.data);
   if(pending){
    if(JSON.stringify(pending.data)===snapshot()){
     localStorage.removeItem(pendingKey);
     pending=null;
    }else if(pending.version!==version){
     conflict=true;
     showConflict();
    }else{
     apply(pending.data);
     if(adapter){
      pending.data=adapter.read();
      localStorage.setItem(pendingKey,JSON.stringify(pending));
     }
    }
   }
   baseline=snapshot();
   ready=true;
   if(scope==='inventory')window.payrollCloudSources.inventory=result.data?'ready':'uninitialized';
   if(document.querySelector('#modal').hidden)render();
   if(pending&&!conflict)void sync();
  }catch{
   if(scope==='inventory'){window.payrollCloudSources.inventory='unavailable';if(page==='payroll'&&document.querySelector('#modal').hidden)render()}
   show('Cloud '+label.toLowerCase()+' could not be loaded.',()=>location.reload(),'Reload');
  }
 })();
}
connectCloudRecords('inventory','Inventory',['parts','purchases','stockMovements','jobs','sales','receipts','appointments','trash']);
connectCloudRecords('insurance','Insurance',['insurance']);
connectCloudRecords('amc','AMC plans and reminders',['amcPlans','amcReminderLogs']);
connectCloudRecords('service-reminders','Service reminders',['serviceReminderLogs']);
connectCloudRecords('lists','Dropdown lists',['lists','vehicleModels']);
connectCloudRecords('stock-counts','Stock counts',['stockCounts']);

const sharedUserFields=['id','username','name','role','status','permissions','actionRestrictions'];
connectCloudRecords('user-permissions','User profiles and permission rules',['users'],{
 read(){
  return {users:db.users.map(user=>Object.fromEntries(sharedUserFields
   .filter(key=>Object.hasOwn(user,key)).map(key=>[key,user[key]])))};
 },
 apply({users}){
  const existing=new Map(db.users.map(user=>[user.id,user]));
  db.users=users.map(profile=>{
   const user=existing.get(profile.id)||{};
   for(const key of sharedUserFields)delete user[key];
   return Object.assign(user,profile);
  });
  window.BD_RECHECK_LOCAL_USER?.();
 }
});

const sharedBusinessFields=[
 'name','phone','address','gst','state','footer','upiId',
 'customerPrefix','vehiclePrefix','jobPrefix',
 'defaultGstRate','defaultPurchaseGstRate','defaultSellingGstRate',
 'defaultInvoiceType','defaultInvoiceTemplates','defaultRegularInvoiceLayout',
 'invoiceLayouts','invoiceStyle','invoiceAccent','invoicePaperSize',
 'logo','logoImage','stampCaption','stampImage','upiQrImage',
 'attendanceGlobalWeeklyOff','attendanceWeeklyOffMode'
];
connectCloudRecords('business-settings','Business settings and invoice templates',['settings','invoiceTemplates'],{
 read(){
  return {
   settings:Object.fromEntries(sharedBusinessFields.filter(key=>Object.hasOwn(db.settings,key)).map(key=>[key,db.settings[key]])),
   invoiceTemplates:db.invoiceTemplates||[]
  };
 },
 apply({settings,invoiceTemplates}){
  for(const key of sharedBusinessFields){
   if(Object.hasOwn(settings,key))db.settings[key]=settings[key];
   else delete db.settings[key];
  }
  if(Array.isArray(invoiceTemplates))db.invoiceTemplates=invoiceTemplates;
 }
});

let cloudRefreshRunning=false;
let cloudRefreshAfter=0;
let cloudRefreshTimer;
let cloudRefreshNeedsRender=false;
function scheduleCloudRefresh(delay=2000){
 clearTimeout(cloudRefreshTimer);
 cloudRefreshTimer=setTimeout(refreshCloudRecordsOnReturn,delay);
}
async function refreshCloudRecordsOnReturn(){
 if(document.visibilityState!=='visible')return;
 if(cloudRefreshRunning||!canRefreshCloudRecords()){
  scheduleCloudRefresh();
  return;
 }
 if(Date.now()<cloudRefreshAfter){
  scheduleCloudRefresh(cloudRefreshAfter-Date.now());
  return;
 }
 cloudRefreshRunning=true;
 cloudRefreshAfter=Date.now()+2000;
 try{
  const results=await Promise.allSettled(cloudRecordRefreshers.map(refresh=>refresh()));
  cloudRefreshNeedsRender||=results.some(result=>result.status==='fulfilled'&&result.value);
  if(cloudRefreshNeedsRender&&canRefreshCloudRecords()){
   cloudRefreshNeedsRender=false;
   const selectors='#content,#workspace,.tablewrap',scrolls=[...document.querySelectorAll(selectors)].map(node=>[node.scrollLeft,node.scrollTop]);
   const position=[window.scrollX,window.scrollY];
   render();
   document.querySelectorAll(selectors).forEach((node,index)=>{if(scrolls[index]){node.scrollLeft=scrolls[index][0];node.scrollTop=scrolls[index][1]}});
   window.scrollTo(...position);
  }
 }finally{
  cloudRefreshRunning=false;
  scheduleCloudRefresh(2000);
 }
}
window.BD_CLOUD_READY.then(ready=>{if(ready){
 window.addEventListener('focus',refreshCloudRecordsOnReturn);
 window.addEventListener('online',refreshCloudRecordsOnReturn);
 document.addEventListener('visibilitychange',refreshCloudRecordsOnReturn);
 scheduleCloudRefresh(2000);
}});
