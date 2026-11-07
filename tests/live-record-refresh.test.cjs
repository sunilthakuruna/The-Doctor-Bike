const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function setup(){let safe=true;const context={page:'customers',db:{customers:[]},cloudRecordRefreshers:[],navigator:{onLine:true},Response,fetch:async()=>Response.json({data:[{id:'one',name:'Synced customer',alt_mobile:'123'}]}),canRefreshCloudRecords:()=>safe,document:{addEventListener(){}},setTimeout(){},scheduleCloudRefresh(){}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/live-record-refresh.js'),'utf8'),context);return {context,block(){safe=false},refresh:()=>context.cloudRecordRefreshers[0]()}}
test('another browser customer save appears in the visible list',async()=>{const app=setup();assert.equal(await app.refresh(),true);assert.equal(app.context.db.customers[0].name,'Synced customer');assert.equal(app.context.db.customers[0].alt,'123');assert.equal(await app.refresh(),false)});
test('open forms are not replaced',async()=>{const app=setup();app.block();assert.equal(await app.refresh(),false);assert.equal(app.context.db.customers.length,0)});
test('a local edit during the request is preserved',async()=>{const app=setup();app.context.fetch=async()=>{app.context.db.customers.push({id:'local'});return Response.json({data:[{id:'remote'}]})};assert.equal(await app.refresh(),false);assert.equal(app.context.db.customers[0].id,'local')});
test('offline and forbidden responses do not clear the list',async()=>{const app=setup();app.context.db.customers=[{id:'existing'}];app.context.fetch=async()=>Response.json({error:'forbidden'},{status:403});assert.equal(await app.refresh(),false);assert.equal(app.context.db.customers[0].id,'existing');app.context.navigator.onLine=false;assert.equal(await app.refresh(),false)});

test('customer dependencies refresh in reminders, AMC, appointments and backups',async()=>{
 for(const page of ['service-reminders','amc-plans','appointments','backup-restore','report-sales','report-profit']){const app=setup();app.context.page=page;assert.equal(await app.refresh(),true,page)}
});
test('dedicated attendance, users and audit loaders run on their matching pages',async()=>{
 const app=setup();let attendance=0,users=0,audit=0;
 app.context.BD_REFRESH_ATTENDANCE=async()=>{attendance++;return true};app.context.BD_REFRESH_APP_USERS=async()=>{users++;return true};app.context.BD_REFRESH_AUDIT=async()=>{audit++;return true};
 app.context.page='payroll';assert.equal(await app.context.cloudRecordRefreshers[6](),true);
 app.context.page='users';assert.equal(await app.context.cloudRecordRefreshers[7](),true);
 app.context.page='audit';assert.equal(await app.context.cloudRecordRefreshers[8](),true);
 assert.equal(attendance,1);assert.equal(users,1);assert.equal(audit,1);
 app.block();assert.equal(await app.context.cloudRecordRefreshers[8](),false);assert.equal(audit,1);
});
test('unsaved attendance and stock counts block background replacement',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../dist/cloud-inventory.js'),'utf8').split('function connectCloudRecords')[0];
 const context={page:'attendance',db:{attendance:{}},attendanceDailyDrafts:{},stockSheet:null,stockSheetView:'',document:{visibilityState:'visible',addEventListener(){},querySelector(){return {hidden:true}},querySelectorAll(){return []},activeElement:null}};
 vm.createContext(context);vm.runInContext(code,context);const safe=()=>vm.runInContext('canRefreshCloudRecords()',context);
 assert.equal(safe(),true);context.attendanceDailyDrafts={'2026-11-07':{staff:{status:'Present'}}};assert.equal(safe(),false);
 context.attendanceDailyDrafts={};context.page='report-stock';context.stockSheet={lines:[{mainPhysical:0}]};assert.equal(safe(),false);context.stockSheetView='saved-sheet';assert.equal(safe(),true);
});
test('attendance refresh updates record versions and preserves unsaved marks',async()=>{
 let cloud=[{day:'2026-11-07',version:'v1',records:{staff:{status:'Present',note:''}}}],sent=null;
 const context={db:{attendance:{}},attendanceDailyDrafts:{},save(){},canRefreshCloudRecords:()=>true,render(){},toast(){},document:{querySelector(){return {hidden:true}}},structuredClone,Response,fetch:async(url,init)=>{if(init?.method==='PUT'){sent=JSON.parse(init.body);return Response.json({version:'v3',records:sent.records})}return Response.json({data:cloud})},BD_CLOUD_READY:Promise.resolve(true)};
 context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../dist/cloud-attendance.js'),'utf8'),context);await new Promise(resolve=>setImmediate(resolve));
 cloud=[{...cloud[0],version:'v2',records:{staff:{status:'Paid Leave',note:''}}}];assert.equal(await context.BD_REFRESH_ATTENDANCE(),true);assert.equal(context.db.attendance['2026-11-07'].staff.status,'Paid Leave');
 context.attendanceDailyDrafts['2026-11-07']={staff:{status:'Absent',note:''}};assert.equal(await context.BD_REFRESH_ATTENDANCE(),false);
 await context.saveCloudAttendance('2026-11-07',context.attendanceDailyDrafts['2026-11-07']);assert.equal(sent.version,'v2');
});

test('all six Operations pages receive changes from the shared inventory refresh',async()=>{
 const full=fs.readFileSync(path.join(__dirname,'../dist/cloud-inventory.js'),'utf8'),code=full.slice(0,full.indexOf("connectCloudRecords('inventory'"));
 const keys=['parts','purchases','stockMovements','jobs','sales','receipts','appointments','trash'];let version=0;
 const memory=new Map(),element=()=>({hidden:true,replaceChildren(){},append(){},before(){}});
 const context={page:'appointments',STORE:'test',db:Object.fromEntries(keys.map(key=>[key,[]])),document:{visibilityState:'visible',activeElement:null,querySelector:element,querySelectorAll:()=>[],createElement:element,addEventListener(){}},localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)},save(){},render(){},toast(){},download(){},navigator:{onLine:true},setInterval(){},addEventListener(){},BD_CLOUD_READY:Promise.resolve(true),payrollCloudSources:{},Response,fetch:async()=>Response.json({version:'v'+version,data:Object.fromEntries(keys.map(key=>[key,[{id:key+'-'+version}]]))})};
 context.window=context;vm.createContext(context);vm.runInContext(code+"connectCloudRecords('inventory','Inventory',"+JSON.stringify(keys)+');',context);await new Promise(resolve=>setImmediate(resolve));
 for(const page of ['appointments','jobs','parts','godown','sales','purchases']){context.page=page;version++;assert.equal(await vm.runInContext('cloudRecordRefreshers[0]()',context),true,page);for(const key of keys)assert.equal(context.db[key][0].id,key+'-'+version,page+' '+key)}
});
