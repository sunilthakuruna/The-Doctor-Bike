const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
test('session checking displays a loading status without a login form',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../dist/user-signin-signout.js'),'utf8');
 const code=source.slice(source.indexOf('function showSessionLoading()'),source.indexOf('function signOut()'));
 let gate=null,created=0;const context={$:()=>gate,document:{createElement(){created++;return {hidden:true,innerHTML:''}},body:{appendChild(node){gate=node}}}};
 vm.createContext(context);vm.runInContext(code+'showSessionLoading()',context);
 assert.equal(gate.hidden,false);assert.match(gate.innerHTML,/role="status"/);assert.doesNotMatch(gate.innerHTML,/<form|password|Sign In/);
 vm.runInContext('showSessionLoading()',context);assert.equal(created,1);
 assert.match(source,/if\(!activeUser\)showSessionLoading\(\)/);
});

test('valid server sessions never open login because offline cache is missing, expired or unavailable',async()=>{
 for(const mode of ['missing','expired','storage-error']){
  const messages=[],user={id:'admin',username:'admin'};let active=null;
  const context={AbortController,setTimeout,clearTimeout,console:{warn(){}},navigator:{onLine:true},document:{visibilityState:'visible',addEventListener(){}},addEventListener(){},setInterval(){},localStorage:{getItem(){if(mode==='storage-error')throw new Error('unavailable');return mode==='expired'?JSON.stringify({user,expires:0}):null},setItem(){if(mode==='storage-error')throw new Error('unavailable')}},fetch:async()=>Response.json({authenticated:true,user}),BD_OPEN_OFFLINE_WORK:async()=>{if(mode==='storage-error')throw new Error('unavailable')},BD_SET_SERVER_USER(value){active=value},BD_SHOW_SERVER_LOGIN(message){messages.push(message)}};
  context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/cloud-owner.js'),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(active?.id,'admin',mode);assert.equal(await context.BD_CLOUD_READY,true,mode);assert.deepEqual(messages,[],mode);
 }
});
