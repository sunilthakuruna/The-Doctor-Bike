const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/offline-queue.js'),'utf8');
function setup(shared=new Map()){
 const events={},writes=[],remote={customers:{data:[]},inventory:{version:'v0',data:{jobs:[]}}},connection={available:true};let serial=0,tail=Promise.resolve();
 const database={transaction(){const tx={objectStore(){return {get(key){const request={};setImmediate(()=>{request.result=structuredClone(shared.get(key));request.onsuccess()});return request},put(data,key){shared.set(key,structuredClone(data));setImmediate(()=>tx.oncomplete?.())}}}};return tx}};
 const element=()=>({hidden:false,textContent:'',append(){}});
 const indexedDB={open(){const request={result:database};setImmediate(()=>request.onsuccess());return request}};
 const network=async(input,init={})=>{if(!connection.available)throw new TypeError('No internet');const route=new URL(input,'https://garage.test').pathname.split('/').at(-1);if(route==='app-auth')return Response.json({authenticated:true,user:{id:'admin'}});if(!init.method||init.method==='GET')return Response.json(remote[route]);
  const body=JSON.parse(init.body);writes.push({route,body});
  if(route==='customers'){if(init.method==='POST')remote.customers.data.push({...body,created_at:'server date'});else {const index=remote.customers.data.findIndex(row=>row.id===body.id);remote.customers.data[index]={...remote.customers.data[index],...body}}return Response.json({data:body})}
  if(body.version!==remote[route].version)return Response.json({error:'conflict'},{status:409});remote[route]={version:'v'+(++serial),data:body.data};return Response.json({version:remote[route].version});
 };
 const context={indexedDB,navigator:{onLine:true,locks:{request(name,fn){const result=tail.then(fn);tail=result.catch(()=>{});return result}}},document:{getElementById(){return {hidden:false,textContent:''}},addEventListener(name,fn){events[name]=fn}},location:{origin:'https://garage.test',href:'https://garage.test/'},crypto:webcrypto,Response,URL,structuredClone,console,setInterval(){},toast(){},fetch:network,addEventListener(name,fn){events[name]=fn}};
 context.document.getElementById=element;context.document.createElement=element;context.setTimeout=setTimeout;context.clearInterval=()=>{};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);
 return {context,shared,remote,writes,events,connection,async cache(route){await context.fetch('/api/'+route)},async open(){await context.BD_OPEN_OFFLINE_WORK({id:'admin'})},async offline(){context.navigator.onLine=false;context.BD_OFFLINE_SESSION=true},async sync(){context.navigator.onLine=true;context.BD_OFFLINE_SESSION=false;await context.BD_SYNC_OFFLINE_WORK()},async put(route,body,method='PUT'){return (await context.fetch('/api/'+route,{method,body:JSON.stringify(body)})).json()}};
}
test('offline create and edit survive reload and reach server in order',async()=>{
 const app=setup();await app.open();await app.cache('customers');await app.offline();
 await app.put('customers',{id:'BD-CUST-1001',name:'First'},'POST');await app.put('customers',{id:'BD-CUST-1001',name:'Second'});
 assert.equal(app.shared.get('admin').queue.length,2);assert.equal(app.writes.length,0);
 const next=setup(app.shared);await next.open();await next.offline();assert.equal((await (await next.context.fetch('/api/customers')).json()).data[0].name,'Second');
 await next.sync();assert.deepEqual(next.writes.map(item=>item.body.name),['First','Second']);assert.equal(next.shared.get('admin').queue.length,0);
});
test('snapshot versions are chained during ordered replay',async()=>{
 const app=setup();await app.open();await app.cache('inventory');await app.offline();
 const first=await app.put('inventory',{version:'v0',data:{jobs:[{id:'job',amount:200}]}});
 await app.put('inventory',{version:first.version,data:{jobs:[{id:'job',amount:450}]}});
 await app.sync();assert.deepEqual(app.writes.map(item=>item.body.version),['v0','v1']);assert.equal(app.remote.inventory.data.jobs[0].amount,450);assert.equal(app.shared.get('admin').queue.length,0);
});
test('a new online save translates the last offline version after replay',async()=>{
 const app=setup();await app.open();await app.cache('inventory');await app.offline();
 const saved=await app.put('inventory',{version:'v0',data:{jobs:[]}});await app.sync();
 await app.put('inventory',{version:saved.version,data:{jobs:[{id:'new'}]}});
 assert.equal(app.writes.at(-1).body.version,'v1');assert.equal(app.remote.inventory.data.jobs[0].id,'new');
});
test('a conflict pauses the first change and preserves all later changes',async()=>{
 const app=setup();await app.open();await app.cache('inventory');await app.offline();
 const first=await app.put('inventory',{version:'v0',data:{jobs:[]}});await app.put('inventory',{version:first.version,data:{jobs:[]}});app.remote.inventory.version='other-browser';
 await app.sync();assert.equal(app.writes.length,0);assert.equal(app.shared.get('admin').queue.length,2);assert.equal(app.shared.get('admin').queue[0].state,'blocked');
});
test('records are isolated by the signed-in user',async()=>{
 const app=setup();await app.open();await app.cache('customers');await app.context.BD_OPEN_OFFLINE_WORK({id:'other'});await app.offline();assert.equal((await app.context.fetch('/api/customers')).status,503);
});

test('save queues safely when mobile reports online but has no internet',async()=>{
 const app=setup();await app.open();await app.cache('customers');app.connection.available=false;
 const saved=await app.put('customers',{id:'BD-CUST-1001',name:'Offline'},'POST');assert.equal(saved.data.name,'Offline');assert.equal(app.shared.get('admin').queue.length,1);assert.equal(app.writes.length,0);
 app.connection.available=true;await app.sync();assert.equal(app.shared.get('admin').queue.length,0);assert.equal(app.remote.customers.data[0].name,'Offline');
});

test('mobile without Web Locks saves and replays through IndexedDB lease',async()=>{
 const app=setup();await app.open();await app.cache('customers');delete app.context.navigator.locks;await app.offline();
 await app.put('customers',{id:'BD-CUST-1001',name:'Mobile'},'POST');assert.equal(app.shared.get('admin').queue.length,1);
 await app.sync();assert.equal(app.shared.get('admin').queue.length,0);
});

test('offline password unlocks waiting cloud loaders even when navigator reports online',async()=>{
 const salt=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16],password='test-password';
 const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
 const bytes=await webcrypto.subtle.deriveBits({name:'PBKDF2',salt:Uint8Array.from(salt),iterations:150000,hash:'SHA-256'},key,256);
 const hash=Buffer.from(bytes).toString('hex'),cached={user:{id:'admin',username:'admin'},salt,hash,expires:Date.now()+60000};
 const handlers={},messages=[];let user=null;
 const context={crypto:webcrypto,TextEncoder,Uint8Array,Date,TypeError,console,navigator:{onLine:true},localStorage:{getItem(){return JSON.stringify(cached)}},document:{visibilityState:'visible',addEventListener(name,handler){handlers[name]=handler}},addEventListener(){},setInterval(){},fetch:async()=>{throw new TypeError('network unavailable')},BD_OPEN_OFFLINE_WORK:async()=>{},BD_SET_SERVER_USER(value){user=value},BD_SHOW_SERVER_LOGIN(message){messages.push(message)},toast(){},FormData:class{*[Symbol.iterator](){yield ['username','admin'];yield ['password',password]}}};
 context.AbortController=AbortController;context.setTimeout=setTimeout;context.clearTimeout=clearTimeout;
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../dist/cloud-owner.js'),'utf8'),context);
 await new Promise(resolve=>setImmediate(resolve));
 let ready=false;context.BD_CLOUD_READY.then(()=>{ready=true});assert.equal(ready,false);
 await handlers.submit({target:{getAttribute(){return 'userLoginForm'},querySelector(){return null}},preventDefault(){},stopImmediatePropagation(){}});
 assert.equal(await context.BD_CLOUD_READY,true);assert.equal(context.BD_OFFLINE_SESSION,true);assert.equal(user.id,'admin');
});

test('normal online login automatically prepares the same form for offline login',async()=>{
 const values=new Map(),user={id:'admin',username:'admin'},handlers={},messages=[];let active=null;
 const context={crypto:webcrypto,TextEncoder,Uint8Array,Date,TypeError,AbortController,setTimeout,clearTimeout,Response,console,navigator:{onLine:true},localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},document:{visibilityState:'visible',querySelector(){return null},addEventListener(name,fn){handlers[name]=fn}},addEventListener(){},setInterval(){},fetch:async()=>Response.json({authenticated:true,user}),location:{reload(){}},BD_OPEN_OFFLINE_WORK:async()=>{},BD_SET_SERVER_USER(value){active=value},BD_SHOW_SERVER_LOGIN(message){messages.push(message)},toast(){},FormData:class{*[Symbol.iterator](){yield ['username','admin'];yield ['password','test-password']}}};
 context.window=context;const code=fs.readFileSync(require('node:path').join(__dirname,'../dist/cloud-owner.js'),'utf8');vm.createContext(context);vm.runInContext(code,context);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(active.id,'admin');assert.equal(messages.length,0);
 const event={target:{getAttribute(){return 'userLoginForm'},querySelector(){return null}},preventDefault(){},stopImmediatePropagation(){}};
 await handlers.submit(event);const cached=JSON.parse(values.get('bike-doctor-offline-login-v1'));assert.equal(cached.user.id,'admin');assert.equal(cached.password,undefined);assert.equal(cached.hash.length,64);
 context.navigator.onLine=false;vm.runInContext(code,context);await handlers.submit(event);assert.equal(active.id,'admin');assert.equal(await context.BD_CLOUD_READY,true);
});
