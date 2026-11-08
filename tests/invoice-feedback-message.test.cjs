const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('job invoice WhatsApp defaults retain financial amounts and approved feedback terms',()=>{
 const bill={id:'BD-JOB-1',customer:'c1',bike:'v1',date:'2026-11-08'};
 const context={db:{settings:{name:'Bike Doctor',phone:'1234567890'},jobs:[bill]},find:()=>({name:'Demo Customer'}),number:()=> 'DEMO-01',money:n=>'₹'+n.toFixed(2),billTotals:()=>({total:450}),paid:()=>100,due:()=>350,invoiceShareMessage:()=> 'Original sale message'};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../dist/invoice-feedback-message.js','utf8'),context);
 const message=context.invoiceShareMessage(bill);
 for(const text of ['Hello Demo Customer','Vehicle: *DEMO-01*','Invoice: BD-JOB-1','Total: *₹450.00*','Paid: ₹100.00','Balance Due: ₹350.00','during vehicle servicing','15 days of delivery','without additional labour charges','Any replacement parts will be charged separately.','1234567890'])assert.ok(message.includes(text),text);
 assert.doesNotMatch(message,/rating|after your approval/i);
 assert.equal(context.invoiceShareMessage({id:'BD-SALE-1'}),'Original sale message');
});
test('walk-in invoice fallback keeps the supplied customer and vehicle names',()=>{
 const b={id:'job',customerName:'Walk-in Name',vehicleNumber:'WALK-01'};const c={db:{settings:{},jobs:[b]},find:()=>null,number:()=>'',money:String,billTotals:()=>({total:0}),paid:()=>0,due:()=>0,invoiceShareMessage(){}};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../dist/invoice-feedback-message.js','utf8'),c);assert.match(c.jobInvoiceWhatsAppMessage(b),/Hello Walk-in Name/);assert.match(c.jobInvoiceWhatsAppMessage(b),/WALK-01/);
});
