const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/../dist/barcode-inventory.js','utf8').split('(()=>')[0];
const c={Event};vm.createContext(c);vm.runInContext(code,c);
test('manufacturer lookup preserves leading zeroes and never changes stock',()=>{
 const parts=[{id:'a',barcode:'0012345678905',opening:5},{id:'b',barcode:'',opening:3}],before=JSON.stringify(parts);
 assert.equal(c.barcodePartMatch(parts,'0012345678905').part.id,'a');
 for(const barcode of ['', '12345678905','not-found'])assert.ok(c.barcodePartMatch(parts,barcode).error);
 assert.ok(c.barcodePartMatch([...parts,{id:'c',barcode:'0012345678905'}],'0012345678905').error);
 assert.equal(JSON.stringify(parts),before);
});
for(const key of ['jobs','sales','purchases'])test(key+' selects through the normal picker and does not save',()=>{
 const draft={key,record:{partLines:[{part:'',qty:4,price:37}]}};let changes=0;
 const picker={value:'',dispatchEvent(event){assert.equal(event.type,'change');changes++}};
 const root={querySelector(selector){assert.match(selector,key==='purchases'?/data-purchase-lookup/:/data-line/);return picker}};
 assert.equal(c.barcodeSelectEntryPart({id:'part-a'},draft,root),'');
 assert.equal(picker.value,'part-a');assert.equal(changes,1);assert.equal(draft.record.partLines[0].qty,4);assert.equal(draft.record.partLines[0].price,37);
});
test('occupied rows remain intact; Add Part is used before selecting another row',()=>{
 const draft={key:'jobs',record:{partLines:[{part:'old',qty:2,price:50}]}};
 const first=JSON.stringify(draft.record.partLines[0]);let added=0,changed=0;
 const root={querySelector(selector){
  if(selector==='[data-action="addPart"]')return {click(){added++;draft.record.partLines.push({part:'',qty:1,price:0})}};
  assert.equal(selector,'[data-line="part|1"]');return {dispatchEvent(){changed++}};
 }};
 assert.equal(c.barcodeSelectEntryPart({id:'new'},draft,root),'');assert.equal(added,1);assert.equal(changed,1);assert.equal(JSON.stringify(draft.record.partLines[0]),first);
});
