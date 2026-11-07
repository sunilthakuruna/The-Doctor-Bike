const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const load=file=>import(pathToFileURL(path.join(__dirname,'../functions/',file)));
const admin={role:'Admin',status:'Active',username:'admin-test',id:'u1'};
function database(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE audit_logs(id INTEGER PRIMARY KEY,action TEXT,detail TEXT,actor TEXT); CREATE TABLE customers(id TEXT PRIMARY KEY,name TEXT,mobile TEXT,alt_mobile TEXT,email TEXT,address TEXT,city TEXT,state TEXT,pin TEXT,gst TEXT,type TEXT,dob TEXT); CREATE TABLE vehicles(id TEXT PRIMARY KEY,customer TEXT REFERENCES customers(id),number TEXT UNIQUE,data TEXT,created_at TEXT,updated_at TEXT); CREATE TABLE staff(id TEXT PRIMARY KEY,data TEXT); CREATE TABLE staff_attachments(staff_id TEXT REFERENCES staff(id) ON DELETE CASCADE,field TEXT,data TEXT,PRIMARY KEY(staff_id,field)); CREATE TABLE expenses(id TEXT PRIMARY KEY,data TEXT)");
 const db={prepare(sql){
  const stmt=sqlite.prepare(sql);let values=[];
  const wrapped={bind(...args){values=args;return wrapped},async first(){return stmt.get(...values)||null},async all(){return {results:stmt.all(...values)}},async run(){
   const results=stmt.columns().length?stmt.all(...values):[];
   if(!stmt.columns().length)stmt.run(...values);
   return {results,meta:{changes:Number(sqlite.prepare('SELECT changes() AS n').get().n)}};
  }};return wrapped;
 },async batch(statements){
  sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results}catch(error){sqlite.exec('ROLLBACK');throw error}
 }};
 return {db,sqlite};
}
async function call(db,body,user=admin){
 const {onRequest}=await load('api/recycle-bin.js');
 return onRequest({env:{DB:db},data:{user},request:new Request('https://test/api/recycle-bin',body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
}
test('D1 deletion archives customer privately and restores without duplicate IDs',async()=>{
 const {db,sqlite}=database(),{recycleDeleteBatch}=await load('recycle-store.js');
 sqlite.exec("INSERT INTO customers(id,name,mobile) VALUES ('c1','Rahul','9999999999')");
 await recycleDeleteBatch(db,[db.prepare("DELETE FROM customers WHERE id='c1'")],admin);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM customers').get().n,0);
 const list=await (await call(db)).json();assert.equal(list.data.length,1);
 assert.equal(list.data[0].deleted_by,'admin-test');assert.equal(list.data[0].payload,undefined);
 assert.equal((await call(db,{id:list.data[0].id,action:'restore'})).status,200);
 assert.equal(sqlite.prepare("SELECT name FROM customers WHERE id='c1'").get().name,'Rahul');
 assert.equal((await call(db,{id:list.data[0].id,action:'restore'})).status,409);
 assert.equal((await (await call(db)).json()).data.length,0);
});
test('failed relational delete rolls back both archive and deletion',async()=>{
 const {db,sqlite}=database(),{recycleDeleteBatch}=await load('recycle-store.js');
 sqlite.exec("INSERT INTO customers(id,name) VALUES ('c1','Rahul'); INSERT INTO vehicles(id,customer,number,data) VALUES ('v1','c1','TEST','{}')");
 await assert.rejects(recycleDeleteBatch(db,[db.prepare("DELETE FROM customers WHERE id='c1'")],admin));
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM recycle_bin').get().n,0);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM customers').get().n,1);
});
test('staff identity attachments survive deletion and restoration',async()=>{
 const {db,sqlite}=database(),{recycleDeleteBatch}=await load('recycle-store.js');
 sqlite.prepare('INSERT INTO staff VALUES (?,?)').run('s1',JSON.stringify({id:'s1',name:'Staff',weeklyOffDay:'Sunday',salary:15000}));
 sqlite.prepare('INSERT INTO staff_attachments VALUES (?,?,?)').run('s1','photo','data:image/png;base64,TEST');
 await recycleDeleteBatch(db,[db.prepare("DELETE FROM staff WHERE id='s1'")],admin);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM staff_attachments').get().n,0);
 const list=await (await call(db)).json();
 const response=await call(db,{id:list.data[0].id,action:'restore'});assert.equal(response.status,200,JSON.stringify(await response.json()));
 assert.equal(sqlite.prepare('SELECT data FROM staff_attachments').get().data,'data:image/png;base64,TEST');
});
test('non-admin cannot list, restore or purge archived records',async()=>{
 const {db}=database(),user={role:'User',status:'Active',id:'u2'};
 assert.equal((await call(db,null,user)).status,403);
 assert.equal((await call(db,{id:'x',action:'restore'},user)).status,403);
 assert.equal((await call(db,{id:'x',action:'purge'},user)).status,403);
});
test('permanent delete removes private payload and cannot be restored',async()=>{
 const {db,sqlite}=database(),{recycleDeleteBatch}=await load('recycle-store.js');
 sqlite.exec("INSERT INTO customers(id,name) VALUES ('c1','Rahul')");
 await recycleDeleteBatch(db,[db.prepare("DELETE FROM customers WHERE id='c1'")],admin);
 const list=await (await call(db)).json(),id=list.data[0].id;
 assert.equal((await call(db,{id,action:'purge'})).status,200);
 assert.equal(sqlite.prepare('SELECT payload FROM recycle_bin WHERE id=?').get(id).payload,'{}');
 assert.equal((await call(db,{id,action:'restore'})).status,409);
});
test('snapshot archive and restore use version checks, preserve stock and reject insufficient stock',async()=>{
 const {db,sqlite}=database(),{snapshotHandler}=await load('snapshot-store.js');
 const handler=snapshotHandler('inventory',['parts','purchases','stockMovements','jobs','sales','receipts','appointments','trash']);
 const part={id:'p1',name:'Part',opening:5},sale={id:'sale1',partLines:[{part:'p1',qty:3,price:100}]};
 const initial={parts:[part],purchases:[],stockMovements:[],jobs:[],sales:[sale],receipts:[],appointments:[],trash:[]};
 async function save(data,version){return handler({env:{DB:db},data:{user:admin},request:new Request('https://test/api/inventory',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({data,version})})})}
 const first=await save(initial,null);assert.equal(first.status,200);const version=(await first.json()).version;
 const second=await save({...initial,sales:[]},version);assert.equal(second.status,200);
 let list=await (await call(db)).json();assert.equal(list.data.length,1);
 const id=list.data[0].id;
 const current=(await load('recycle-store.js')).readRecycleSnapshot;
 let snapshot=await current(db,'inventory');
 await save({...snapshot.data,parts:[{...part,opening:1}]},snapshot.version);
 assert.equal((await call(db,{id,action:'restore'})).status,409);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM recycle_operations').get().n,0);
 snapshot=await current(db,'inventory');await save({...snapshot.data,parts:[part]},snapshot.version);
 assert.equal((await call(db,{id,action:'restore'})).status,200);
 snapshot=await current(db,'inventory');assert.equal(snapshot.data.sales.length,1);
 assert.equal((await (await call(db)).json()).data.length,0);
 // A stale write must not archive a record or replace the restored snapshot.
 assert.equal((await save({...initial,sales:[]},version)).status,409);
 assert.equal((await current(db,'inventory')).data.sales.length,1);
});
test('restore dependent vehicle requires its customer to be restored first',async()=>{
 const {db,sqlite}=database(),{recycleDeleteBatch}=await load('recycle-store.js');
 sqlite.exec("INSERT INTO customers(id,name) VALUES ('c1','Rahul')");
 sqlite.prepare('INSERT INTO vehicles(id,customer,number,data) VALUES (?,?,?,?)').run('v1','c1','TEST',JSON.stringify({id:'v1',customer:'c1',number:'TEST'}));
 await recycleDeleteBatch(db,[db.prepare("DELETE FROM vehicles WHERE id='v1'"),db.prepare("DELETE FROM customers WHERE id='c1'")],admin);
 const list=(await (await call(db)).json()).data,vehicle=list.find(row=>row.collection==='bikes'),customer=list.find(row=>row.collection==='customers');
 assert.equal((await call(db,{id:vehicle.id,action:'restore'})).status,409);
 assert.equal((await call(db,{id:customer.id,action:'restore'})).status,200);
 assert.equal((await call(db,{id:vehicle.id,action:'restore'})).status,200);
});
test('duplicate restoration rolls back its operation claim, allowing a later valid retry',async()=>{
 const {db,sqlite}=database(),{recycleDeleteBatch}=await load('recycle-store.js');
 sqlite.exec("INSERT INTO customers(id,name) VALUES ('c1','Original')");
 await recycleDeleteBatch(db,[db.prepare("DELETE FROM customers WHERE id='c1'")],admin);
 const id=(await (await call(db)).json()).data[0].id;
 sqlite.exec("INSERT INTO customers(id,name) VALUES ('c1','New')");
 assert.equal((await call(db,{id,action:'restore'})).status,409);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM recycle_operations').get().n,0);
 assert.equal(sqlite.prepare("SELECT name FROM customers WHERE id='c1'").get().name,'New');
 await recycleDeleteBatch(db,[db.prepare("DELETE FROM customers WHERE id='c1'")],admin);
 assert.equal((await call(db,{id,action:'restore'})).status,200);
 assert.equal(sqlite.prepare("SELECT name FROM customers WHERE id='c1'").get().name,'Original');
});
test('legacy permanent deletion removes archived payload from both stores and does not reappear',async()=>{
 const {db}=database(),{snapshotHandler}=await load('snapshot-store.js');
 const handler=snapshotHandler('inventory',['parts','purchases','stockMovements','jobs','sales','receipts','appointments','trash']);
 const data={parts:[],purchases:[],stockMovements:[],jobs:[],sales:[],receipts:[],appointments:[],trash:[{key:'sales',record:{id:'old-sale',walkin:'Private name',partLines:[]},receipts:[],removedAt:'2026-11-01T00:00:00Z'}]};
 await handler({env:{DB:db},data:{user:admin},request:new Request('https://test/api/inventory',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({data,version:null})})});
 const list=(await (await call(db)).json()).data;assert.equal(list.length,1);
 assert.equal((await call(db,{id:list[0].id,action:'purge'})).status,200);
 assert.equal((await (await call(db)).json()).data.length,0);
 const {data:snapshot}=await (await load('recycle-store.js')).readRecycleSnapshot(db,'inventory');
 assert.equal(snapshot.trash.length,0);
});
test('insurance record archives and restores in its own snapshot',async()=>{
 const {db,sqlite}=database(),{snapshotHandler}=await load('snapshot-store.js');
 sqlite.exec("INSERT INTO customers(id,name) VALUES ('c1','Rahul')");
 sqlite.prepare('INSERT INTO vehicles(id,customer,number,data) VALUES (?,?,?,?)').run('v1','c1','TEST',JSON.stringify({id:'v1',customer:'c1',number:'TEST'}));
 const handler=snapshotHandler('insurance',['insurance']),policy={id:'ins1',customer:'c1',bike:'v1',document:'data:application/pdf;base64,TEST'};
 async function save(records,version){return handler({env:{DB:db},data:{user:admin},request:new Request('https://test/api/insurance',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({data:{insurance:records},version})})})}
 const first=await save([policy],null),version=(await first.json()).version;
 await save([],version);
 const list=(await (await call(db)).json()).data;assert.equal(list[0].collection,'insurance');
 assert.equal((await call(db,{id:list[0].id,action:'restore'})).status,200);
 const snapshot=await (await load('recycle-store.js')).readRecycleSnapshot(db,'insurance');
 assert.equal(snapshot.data.insurance[0].document,policy.document);
});
