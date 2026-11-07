const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/app.js'),'utf8');
const helper=source.slice(source.indexOf('function deletionLinkedRecords'),source.indexOf('function showDeletionLinkedRecords'));
test('customer stays linked until each matching vehicle and bill is removed',()=>{
 const db={bikes:[{id:'v1',customer:'c1',number:'TEST1'}],jobs:[{id:'j1',customer:'c1'},{id:'j2',customer:'other'}],sales:[]};
 const context=vm.createContext({db,find:(key,id)=>(db[key]||[]).find(r=>r.id===id)});
 vm.runInContext(helper,context);
 assert.equal(context.deletionLinkedRecords('customers','c1').length,2);
 db.jobs=db.jobs.filter(r=>r.id!=='j1');
 assert.equal(context.deletionLinkedRecords('customers','c1')[0].id,'v1');
 db.bikes=[];
 assert.equal(context.deletionLinkedRecords('customers','c1').length,0);
});
test('job card lists both receipt and appointment blockers',()=>{
 const db={receipts:[{id:'r1',bill:'j1'}],appointments:[{id:'a1',job:'j1'}]};
 const context=vm.createContext({db,find:()=>null});
 vm.runInContext(helper,context);
 assert.deepEqual(Array.from(context.deletionLinkedRecords('jobs','j1'),r=>r.id),['r1','a1']);
});
