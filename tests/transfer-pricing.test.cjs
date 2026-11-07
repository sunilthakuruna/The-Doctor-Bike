const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/godown-stock.js'),'utf8');
function setup(){
 const context={find:(key,id)=>id==='purchase'?{partLines:[{part:'filter',price:100,gst:18}]}:null,round:n=>Math.round(n*100)/100};
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('function movementPurchaseGstRate('),source.indexOf('function godownTransferLots(')),context);
 return context;
}
test('historical transfer uses its specific purchase line GST, not master GST',()=>{
 const c=setup(),m={part:'filter',sourcePurchaseId:'purchase',sourcePurchaseLine:0,sourceUnitCost:100};
 assert.equal(c.movementPurchaseGstRate(m),18);assert.equal(c.movementPurchaseGross(m),118);
});
test('saved transfer pricing stays fixed if its purchase changes',()=>{
 const c=setup(),m={part:'filter',sourcePurchaseId:'purchase',sourceUnitCost:100,purchaseGstRate:5,unitCostAfterGst:105};
 assert.equal(c.movementPurchaseGstRate(m),5);assert.equal(c.movementPurchaseGross(m),105);
});
test('unlinked historical cost is unknown rather than falsely shown excluding GST',()=>{
 const c=setup();assert.equal(c.movementPurchaseGross({sourceUnitCost:100}),null);
 assert.equal(c.movementPurchaseGstRate({sourcePurchaseId:'purchase',part:'different'}),null);
});
