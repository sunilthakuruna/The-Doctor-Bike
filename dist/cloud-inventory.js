function connectCloudRecords(scope,label,collections){
 const pendingKey=STORE+'-'+scope+'-pending-v1';
 const snapshot=()=>JSON.stringify(Object.fromEntries(collections.map(key=>[key,db[key]||[]])));
 const apply=data=>{for(const key of collections)db[key]=data[key]};
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
 const saveWorkspace=save;

 function showConflict(){
  show(label+' changed in another browser. Your unsynced changes are still saved in this tab.',()=>{
   download(JSON.stringify(pending,null,2),scope+'-unsynced.json','application/json');
   show('Keep the downloaded copy for review. Reload to use the latest cloud records.',()=>{
    sessionStorage.removeItem(pendingKey);
    location.reload();
   },'Reload cloud records');
  },'Download unsynced changes');
 }

 async function sync(){
  if(!ready||busy||conflict||!pending)return;
  busy=true;
  const sent=pending;
  try{
   const response=await fetch('/api/'+scope,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({version,data:sent.data})});
   const result=await response.json();
   if(response.status===409){conflict=true;showConflict();return}
   if(!response.ok||!result.version)throw new Error(result.error||label+' sync failed.');
   version=result.version;
   if(pending===sent){
    sessionStorage.removeItem(pendingKey);
    pending=null;
    show('');
    toast(label+' saved to Cloudflare D1.');
   }else{
    pending.version=version;
    sessionStorage.setItem(pendingKey,JSON.stringify(pending));
   }
  }catch(error){
   show(error.message+' Your changes are saved in this tab and are waiting to sync.',sync,'Retry sync');
   return;
  }finally{busy=false}
  if(pending)void sync();
 }

 save=function(message){
  const current=snapshot();
  if(current===baseline)return saveWorkspace(message);
  if(!ready||conflict){
   toast('Cloud '+label.toLowerCase()+' is unavailable. Reload before changing records.');
   return false;
  }
  const previous=pending;
  const next={version,data:JSON.parse(current)};
  try{
   sessionStorage.setItem(pendingKey,JSON.stringify(next));
   if(saveWorkspace()===false)throw new Error();
  }catch{
   if(previous)sessionStorage.setItem(pendingKey,JSON.stringify(previous));
   else sessionStorage.removeItem(pendingKey);
   toast(label+' could not be saved in this tab.');
   return false;
  }
  baseline=current;
  pending=next;
  show(label+' changes are waiting to sync.');
  void sync();
  return true;
 };

 (async()=>{
  if(!await window.BD_CLOUD_READY)return;
  try{
   const response=await fetch('/api/'+scope,{cache:'no-store'});
   const result=await response.json();
   if(!response.ok||!Object.hasOwn(result,'version'))throw new Error();
   pending=JSON.parse(sessionStorage.getItem(pendingKey)||'null');
   version=result.version;
   if(result.data)apply(result.data);
   if(pending){
    if(JSON.stringify(pending.data)===snapshot()){
     sessionStorage.removeItem(pendingKey);
     pending=null;
    }else if(pending.version!==version){
     conflict=true;
     showConflict();
    }else apply(pending.data);
   }
   baseline=snapshot();
   ready=true;
   if(document.querySelector('#modal').hidden)render();
   if(pending&&!conflict)void sync();
  }catch{
   show('Cloud '+label.toLowerCase()+' could not be loaded.',()=>location.reload(),'Reload');
  }
 })();
}
connectCloudRecords('inventory','Inventory',['parts','purchases','stockMovements','jobs','sales','receipts','appointments','trash']);
connectCloudRecords('insurance','Insurance',['insurance']);
connectCloudRecords('amc','AMC plans and reminders',['amcPlans','amcReminderLogs']);
connectCloudRecords('service-reminders','Service reminders',['serviceReminderLogs']);
