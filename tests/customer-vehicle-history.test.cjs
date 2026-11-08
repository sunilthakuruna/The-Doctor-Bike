const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../dist/customer-vehicle-history.js','utf8').split('(()=>')[0],context);
const data={bikes:[{id:'v1',customer:'c1',number:'ONE',amcScope:'vehicle',amcType:'Basic',amcStart:'2026-01-01',amcExpiry:'2027-01-01',nextServiceDate:'2026-12-01'},{id:'v2',customer:'c2'}],jobs:[{id:'j1',customer:'c1',bike:'v1',date:'2026-11-01',advance:100},{id:'j2',customer:'c2',bike:'v2',date:'2026-11-02'}],sales:[{id:'s1',customer:'c1',date:'2026-11-03'}],receipts:[{id:'r1',bill:'j1',date:'2026-11-04',amount:50},{id:'r2',bill:'j2',amount:70}],insurance:[{id:'i1',bike:'v1',issue:'2026-10-01'}],appointments:[]};
test('customer history joins by stable IDs, includes advance once, and leaves source unchanged',()=>{
 const before=JSON.stringify(data),rows=context.garageHistoryRecords(data,'customers','c1',()=>true),ids=rows.map(r=>r.record.id);
 for(const id of ['v1','j1','s1','r1','j1-advance','i1'])assert.ok(ids.includes(id));
 for(const id of ['v2','j2','r2'])assert.ok(!ids.includes(id));
 assert.equal(ids.filter(id=>id==='j1-advance').length,1);assert.equal(rows[0].type,'Service due');assert.equal(JSON.stringify(data),before);
});
test('vehicle history excludes customer-only counter sales and other vehicles',()=>{
 const rows=context.garageHistoryRecords(data,'bikes','v1',()=>true);
 assert.ok(rows.some(r=>r.record.id==='j1'));assert.ok(!rows.some(r=>['s1','j2','v2'].includes(r.record.id)));
});
test('restricted modules and their payments are excluded from history',()=>{
 const rows=context.garageHistoryRecords(data,'customers','c1',key=>['bikes','payments'].includes(key));
 assert.ok(rows.every(r=>r.module==='bikes'));assert.ok(!rows.some(r=>r.record.id==='r1'));
});
