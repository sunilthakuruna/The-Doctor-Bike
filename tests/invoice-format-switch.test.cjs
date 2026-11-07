const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

test('thermal preview opens the selected A4 or A5 paper for the same bill',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../dist/attachments.js'),'utf8');
 const nodes={};
 const calls=[];
 const context={
  $:selector=>nodes[selector]||(nodes[selector]={value:'58',insertAdjacentHTML(){}}),
  openThermalInvoice:(...args)=>calls.push(['thermal',...args]),
  invoice:(...args)=>calls.push(['regular',...args]),
  invoiceFormatControls:()=>''
 };
 vm.createContext(context);
 vm.runInContext(source.slice(source.indexOf('const thermalBeforeFormatChoice='),source.indexOf('const renderBeforeFormatChoice=')),context);
 context.openThermalInvoice('jobs','qa-job',80);
 nodes['#chooseA5Invoice'].onclick();
 nodes['#chooseA4Invoice'].onclick();
 nodes['#chooseThermalInvoice'].onclick();
 assert.deepEqual(calls,[['thermal','jobs','qa-job',80],['regular','jobs','qa-job','A5'],['regular','jobs','qa-job','A4'],['thermal','jobs','qa-job','58']]);
});
