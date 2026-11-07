const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
test('new staff ID skips identities retained in historical attendance',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../dist/app.js'),'utf8');
 const context={db:{settings:{},staff:[{id:'BD-STF-1001'}],attendance:{'2026-11-03':{'BD-STF-1002':{status:'Present'}}}},prefixes:{staff:'BD-STF'}};
 vm.createContext(context);vm.runInContext(source.match(/function nextId\(key\)\{[^\n]+/)[0],context);
 assert.equal(context.nextId('staff'),'BD-STF-1003');
});
test('D1 rejects reusing a staff identity with old attendance without changing either record',async()=>{
 const {onRequest}=await import('../functions/api/staff.js');
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec('CREATE TABLE attendance_days(day TEXT PRIMARY KEY,records TEXT NOT NULL,version TEXT NOT NULL)');
 sqlite.prepare('INSERT INTO attendance_days VALUES (?,?,?)').run('2026-11-03',JSON.stringify({'BD-STF-1002':{status:'Present',note:''}}),'v1');
 const db={prepare(sql){let args=[];return {bind(...values){args=values;return this},async first(){return sqlite.prepare(sql).get(...args)||null},async run(){return {meta:sqlite.prepare(sql).run(...args)}}}},async batch(statements){return Promise.all(statements.map(s=>s.run()))}};
 try{
  const response=await onRequest({env:{DB:db},request:new Request('https://test.invalid/api/staff',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'BD-STF-1002',name:'New person'})})});
  assert.equal(response.status,409);assert.match((await response.json()).error,/historical attendance/);
  assert.equal(sqlite.prepare('SELECT count(*) AS n FROM staff').get().n,0);
  assert.equal(JSON.parse(sqlite.prepare('SELECT records FROM attendance_days').get().records)['BD-STF-1002'].status,'Present');
 }finally{sqlite.close()}
});
