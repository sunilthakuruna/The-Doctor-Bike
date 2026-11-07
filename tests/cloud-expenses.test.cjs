const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/cloud-expenses.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(fetch){
 const saved=[];
 const context={db:{expenses:[{id:'old-cache',amount:25000}]},page:'dashboard',BD_CLOUD_READY:Promise.resolve(true),payrollCloudSources:{expenses:'loading'},navigator:{onLine:true},canRefreshCloudRecords:()=>true,basicPage:()=> 'expense table',reportPage:()=> 'profit report',money:n=>String(n),render(){},toast(){},deleteRecord(){},save(){saved.push(JSON.parse(JSON.stringify(context.db.expenses)))},fetch,document:{querySelector:()=>({hidden:true})}};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);return {c:context,saved};
}
test('two browsers replace different stale caches with the same D1 total and persist it',async()=>{
 const remote=[{id:'rent',amount:10000},{id:'electricity',amount:100}];
 const first=setup(async()=>Response.json({data:remote})),second=setup(async()=>Response.json({data:remote}));
 second.c.db.expenses=[{id:'other-cache',amount:999}];
 assert.equal(first.c.BD_EXPENSE_TOTAL_TEXT(),'Loading…');assert.doesNotMatch(first.c.basicPage('expenses'),/expense table/);
 await tick();for(const app of [first,second]){assert.equal(app.c.BD_EXPENSE_TOTAL_TEXT(),'10100');assert.deepEqual(app.saved.at(-1),remote);app.c.save();assert.deepEqual(app.saved.at(-1),remote)}
});
test('failed initial D1 load shows unavailable instead of the old amount',async()=>{
 const {c}=setup(async()=>Response.json({error:'failed'},{status:500}));await tick();
 assert.equal(c.BD_EXPENSE_TOTAL_TEXT(),'Unavailable');assert.match(c.basicPage('expenses'),/could not be loaded/);c.page='report-profit';assert.match(c.reportPage(),/could not be loaded/);
});
test('a background GET started before an expense save cannot undo the save',async()=>{
 let resolveRead;
 const app=setup(async()=>Response.json({data:[{id:'rent',amount:10000}]}));await tick();
 app.c.fetch=async(url,options)=>options?.method?Response.json({data:{id:'new',amount:100}}):new Promise(resolve=>{resolveRead=resolve});
 const refresh=app.c.BD_REFRESH_EXPENSES();await app.c.saveCloudExpense(null,{id:'new',amount:100});
 resolveRead(Response.json({data:[{id:'rent',amount:10000}]}));assert.equal(await refresh,false);
 assert.equal(app.c.BD_EXPENSE_TOTAL_TEXT(),'10100');app.c.save();assert.equal(app.saved.at(-1).length,2);
});
test('refresh does not run during a write or replace an open form',async()=>{
 let resolveWrite,calls=0;const {c}=setup(async()=>Response.json({data:[]}));await tick();
 c.fetch=async()=>{calls++;return new Promise(resolve=>{resolveWrite=resolve})};
 const write=c.saveCloudExpense(null,{id:'new',amount:10});assert.equal(await c.BD_REFRESH_EXPENSES(),false);
 resolveWrite(Response.json({data:{id:'new',amount:10}}));await write;
 c.canRefreshCloudRecords=()=>false;assert.equal(await c.BD_REFRESH_EXPENSES(),false);assert.equal(calls,1);
});
test('initial offline cache provided by the authenticated outbox remains usable',async()=>{
 const {c}=setup(async()=>Response.json({data:[{id:'queued',amount:250}]},{headers:{'x-bike-offline':'1'}}));
 c.BD_OFFLINE_SESSION=true;c.navigator.onLine=false;await tick();assert.equal(c.BD_EXPENSE_TOTAL_TEXT(),'250');
});
