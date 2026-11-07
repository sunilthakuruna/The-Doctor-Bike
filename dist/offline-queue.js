/* Per-user offline records and an ordered, durable outbox. API responses are never cached by the service worker. */
(() => {
 const network=window.fetch.bind(window), snapshots=new Set(['inventory','insurance','amc','service-reminders','lists','stock-counts','business-settings']);
 const collections={customers:'customers',vehicles:'bikes',services:'services',staff:'staff',accounts:'accounts',expenses:'expenses',attendance:'attendance'};
 let owner='',running=false,store,transportOffline=false;
 const opened=new Promise((resolve,reject)=>{const request=indexedDB.open('bike-doctor-offline-work',1);request.onupgradeneeded=()=>request.result.createObjectStore('users');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
 const lock=fn=>navigator.locks?navigator.locks.request('bike-doctor-offline-outbox',fn):Promise.reject(new Error('Offline saving requires a browser supporting secure tab coordination.'));
 async function read(){const database=await opened;return new Promise((resolve,reject)=>{const request=database.transaction('users').objectStore('users').get(owner);request.onsuccess=()=>resolve(request.result||{cache:{},queue:[],versions:{}});request.onerror=()=>reject(request.error)})}
 async function write(data){const database=await opened;await new Promise((resolve,reject)=>{const tx=database.transaction('users','readwrite');tx.objectStore('users').put(data,owner);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});store=data;draw()}
 const response=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-bike-offline':'1'}});
 function draw(){if(!owner)return;let banner=document.getElementById('offlineWorkStatus');if(!banner){banner=document.createElement('div');banner.id='offlineWorkStatus';banner.className='notice';banner.setAttribute('role','status');document.querySelector('#content')?.before(banner)}if(!banner)return;
  const first=store?.queue[0];banner.hidden=navigator.onLine&&!first;
  banner.textContent=first?`${store.queue.length} changes saved on this device. ${first.state==='blocked'||first.state==='sending'?'Sync paused: '+(first.error||'a previous delivery needs review.'):navigator.onLine?'Syncing in saved order…':'They will sync in saved order when connected.'}`:'Offline: working with records downloaded on this device.';
  if(first&&(first.state==='blocked'||first.state==='sending')){const button=document.createElement('button');button.type='button';button.className='btn small';button.textContent='Download pending changes';button.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(store.queue,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='bike-doctor-pending-changes.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};banner.append(' ',button)}
 }
 window.BD_OPEN_OFFLINE_WORK=async user=>{owner=user.id;store=await read();draw()};
 function optimistic(route,method,body,url,cached){
  if(snapshots.has(route)){if(method!=='PUT'||!cached)throw new Error('Open this module online before using it offline.');const version='offline-'+crypto.randomUUID();return {reply:{version},cached:{version,data:body.data}}}
  if(route==='attendance'){if(!cached)throw new Error('Open Attendance online first.');const version='offline-'+crypto.randomUUID(),rows=cached.data.filter(row=>row.day!==body.day);rows.push({day:body.day,records:body.records,version});return {reply:{version,records:body.records},cached:{data:rows}}}
  if(!collections[route]||!cached||!Array.isArray(cached.data))throw new Error('This operation requires an internet connection.');
  let rows=structuredClone(cached.data),records=Array.isArray(body)?body:[body];
  if(method==='DELETE'){const id=url.searchParams.get('id');rows=rows.filter(row=>row.id!==id);return {reply:{data:{id},ok:true},cached:{data:rows}}}
  records=records.map(row=>({...row,id:row.id||'offline-'+crypto.randomUUID()}));
  for(const row of records){const i=rows.findIndex(item=>item.id===row.id);if(method==='POST'&&i>=0)throw new Error('This record ID already exists.');if(method==='PUT'&&i<0)throw new Error('The record is not available offline.');if(i>=0)rows[i]={...rows[i],...row};else rows.push(row)}
  return {body:Array.isArray(body)?records:records[0],reply:{data:Array.isArray(body)?records:records[0]},cached:{data:rows}};
 }
 async function enqueue(route,method,body,url){return lock(async()=>{
  const data=await read(),cached=data.cache[route],result=optimistic(route,method,body,url,cached);
  data.queue.push({id:crypto.randomUUID(),url:url.pathname+url.search,route,method,body:result.body||body,base:cached,localVersion:result.reply.version,state:'queued',savedAt:Date.now()});
  data.cache[route]=result.cached;await write(data);return response(result.reply);
 })}
 async function sync(){if(running||!owner||!navigator.onLine||window.BD_OFFLINE_SESSION)return;running=true;
  try{await lock(async()=>{let data=await read();while(data.queue.length){const entry=data.queue[0];if(entry.state!=='queued')break;
   const check=await network('/api/'+entry.route,{cache:'no-store'});if(!check.ok){entry.state='blocked';entry.error='Sign in online or check your permissions.';await write(data);break}const current=await check.json();
   const body=structuredClone(entry.body);if(body&&Object.hasOwn(body,'version'))body.version=data.versions[body.version]||body.version;
   let conflict=false;
   if(snapshots.has(entry.route))conflict=current.version!==body.version;
   else if(entry.route==='attendance')conflict=(current.data.find(row=>row.day===body.day)?.version??null)!==body.version;
   else {const ids=entry.method==='DELETE'?[new URL(entry.url,location.origin).searchParams.get('id')]:(Array.isArray(body)?body:[body]).map(row=>row.id);conflict=ids.some(id=>{
    const remote=current.data.find(row=>row.id===id),base=entry.base.data.find(row=>row.id===id);
    if(!base||!remote)return !!base!==!!remote;
    return Object.keys(base).filter(key=>!['created_at','updated_at','alt'].includes(key)).some(key=>JSON.stringify(remote[key]??'')!==JSON.stringify(base[key]??''));
   })}
   if(conflict){entry.state='blocked';entry.error='Cloud records changed. Review before syncing.';await write(data);break}
   entry.state='sending';await write(data);
   let result;try{result=await network(entry.url,{method:entry.method,headers:{'content-type':'application/json'},body:entry.method==='DELETE'?undefined:JSON.stringify(body)})}catch{entry.state='blocked';entry.error='Delivery could not be confirmed. Review before retrying.';await write(data);break}
   if(!result.ok){entry.state='blocked';entry.error='Server rejected a change ('+result.status+'). Later changes are waiting.';await write(data);break}
   const saved=await result.json();if(entry.localVersion)data.versions[entry.localVersion]=saved.version;
   data.queue.shift();await write(data);if(!data.queue.some(item=>item.route===entry.route)){const latest=await network('/api/'+entry.route,{cache:'no-store'});if(latest.ok)data.cache[entry.route]=await latest.json()}
   await write(data);
  }store=data;draw()})}catch{draw()}finally{running=false}
 }
 window.BD_SYNC_OFFLINE_WORK=sync;
 window.fetch=async(input,init={})=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href),method=(init.method||input.method||'GET').toUpperCase(),route=url.pathname.split('/').at(-1);
  if(!owner||url.origin!==location.origin||!url.pathname.startsWith('/api/')||(!snapshots.has(route)&&!collections[route]))return network(input,init);
  store=await read();
  if(method==='GET'){
   if(store.queue.length||window.BD_OFFLINE_SESSION||!navigator.onLine){if(store.cache[route])return response(store.cache[route]);return response({error:'Open this module online on this device first.'},503)}
   try{const result=await network(input,init);transportOffline=false;if(result.ok&&result.status!==304){const body=await result.clone().json();await lock(async()=>{const data=await read();if(!data.queue.length){data.cache[route]=body;await write(data)}})}return result}catch(error){transportOffline=true;if(store.cache[route])return response(store.cache[route]);throw error}
  }
  if(!['POST','PUT','DELETE'].includes(method))return network(input,init);
  if(window.BD_OFFLINE_SESSION||!navigator.onLine||transportOffline||store.queue.length){const result=await enqueue(route,method,init.body?JSON.parse(init.body):null,url);void sync();return result}
  // A network error after transmission is ambiguous: do not blindly replay it.
  return network(input,init);
 };
 async function reconnect(){
  if(window.BD_OFFLINE_SESSION){try{const result=await network('/api/app-auth',{cache:'no-store'}),session=await result.json();
   if(!result.ok||!session.authenticated||session.user?.id!==owner){window.BD_SHOW_SERVER_LOGIN('Sign in online to upload your pending changes in order.');return}
   window.BD_OFFLINE_SESSION=false;window.BD_SET_SERVER_USER(session.user);
  }catch{return}}
  draw();await sync();
 }
 window.addEventListener('online',()=>{void reconnect()});window.addEventListener('offline',draw);
 document.addEventListener('click',event=>{if(navigator.onLine&&!window.BD_OFFLINE_SESSION&&!store?.queue.length)return;
  if(event.target.closest?.('[data-invoice],[data-action="print"],#printInvoice')){event.preventDefault();event.stopImmediatePropagation();toast('Sync pending changes online before issuing an invoice.')}
 },true);
 setInterval(()=>{void sync()},15000);
 const previousToast=toast;toast=function(message,...args){if(store?.queue.length&&/saved.*(?:cloud|D1)|saved to Cloudflare/i.test(message))message='Saved on this device; waiting to sync in order.';return previousToast(message,...args)};
})();
