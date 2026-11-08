const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('job invoice WhatsApp defaults retain financial amounts and approved feedback terms',()=>{
 const bill={id:'BD-JOB-1',customer:'c1',bike:'v1',date:'2026-11-08'};
 const context={db:{settings:{name:'Bike Doctor',phone:'1234567890'},jobs:[bill]},shareSavedRecordBundleNow(){},find:()=>({name:'Demo Customer'}),number:()=> 'DEMO-01',money:n=>'₹'+n.toFixed(2),billTotals:()=>({total:450}),paid:()=>100,due:()=>350,invoiceShareMessage:()=> 'Original sale message'};
 vm.createContext(context);vm.runInContext(fs.readFileSync(__dirname+'/../dist/invoice-feedback-message.js','utf8'),context);
 const message=context.invoiceShareMessage(bill);
 for(const text of ['Hello Demo Customer','Vehicle: *DEMO-01*','Invoice: BD-JOB-1','Total: *₹450.00*','Paid: ₹100.00','Balance Due: ₹350.00','during vehicle servicing','15 days of delivery','without additional labour charges','Any replacement parts will be charged separately.','1234567890'])assert.ok(message.includes(text),text);
 assert.doesNotMatch(message,/rating|after your approval/i);
 assert.equal(context.invoiceShareMessage({id:'BD-SALE-1'}),'Original sale message');
});
test('walk-in invoice fallback keeps the supplied customer and vehicle names',()=>{
 const b={id:'job',customerName:'Walk-in Name',vehicleNumber:'WALK-01'};const c={db:{settings:{},jobs:[b]},shareSavedRecordBundleNow(){},find:()=>null,number:()=>'',money:String,billTotals:()=>({total:0}),paid:()=>0,due:()=>0,invoiceShareMessage(){}};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../dist/invoice-feedback-message.js','utf8'),c);assert.match(c.jobInvoiceWhatsAppMessage(b),/Hello Walk-in Name/);assert.match(c.jobInvoiceWhatsAppMessage(b),/WALK-01/);
});

test('job share shortcut opens message review instead of a file-only share menu',()=>{
 const bill={id:'job',customer:'c'},calls=[];const c={db:{settings:{name:'Garage'},jobs:[bill]},find:(key)=>key==='jobs'?bill:{name:'Customer'},number:()=>'',money:String,billTotals:()=>({total:450}),paid:()=>100,due:()=>350,invoiceShareMessage:()=>'',shareSavedRecordBundleNow(){calls.push('old-file-share')},messagePreview:(phone,text,context)=>calls.push({phone,text,context})};vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../dist/invoice-feedback-message.js','utf8'),c);c.shareSavedRecordBundleNow('jobs','job','9999999999','Approved message');assert.equal(calls.length,1);assert.equal(calls[0].text,'Approved message');assert.equal(calls[0].context.key,'jobs');c.shareSavedRecordBundleNow('sales','sale','9999999999','Sale');assert.equal(calls[1],'old-file-share');
});
test('invoice preview includes generated PDF, approved text and manual attachments in one share',async()=>{
 let shared;
 const nodes=new Map();
 function element(){return {value:'Invoice amount and feedback',isConnected:false,disabled:false,checked:false,addEventListener(){},removeAttribute(){},setAttribute(){},before(){},append(){},after(node){if(node?.id)nodes.set('#'+node.id,node)},closest(){return this},set innerHTML(html){this.html=html;for(const match of html.matchAll(/id="([^"]+)"/g))nodes.set('#'+match[1],element())}}}
 const c={$:selector=>nodes.get(selector),find:()=>({id:'job'}),messagePreview(){nodes.set('#whatsappMessage',element())},document:{createElement:element},esc:String,whatsappNumber:()=> '919999999999',temporaryShareFilesFor:()=>[],navigator:{canShare:()=>true,share:async payload=>{shared=payload}},validateInvoiceMedia(){},toast(){},a4InvoiceCanvas:()=>({}),canvasPng:async()=>new Blob(),invoiceCanvasPdf:async()=>new File(['pdf'],'invoice.pdf'),File,Blob,URL,setTimeout,icon:()=>'',whatsappIcon:()=>''};
 vm.createContext(c);const source=fs.readFileSync(__dirname+'/../dist/invoice-media.js','utf8');vm.runInContext(source.slice(source.indexOf('const messageBeforeUnifiedFileShare='),source.indexOf('function addInvoiceMediaButton(')),c);
 c.messagePreview('9999999999','Invoice amount and feedback',{key:'jobs',id:'job'});
 assert.ok(nodes.has('#receiptImagePreview'));assert.ok(nodes.has('#copyInvoiceWhatsAppText'));assert.ok(nodes.has('#shareInvoiceMedia'));assert.ok(nodes.has('#downloadInvoicePdf'));
 await new Promise(setImmediate);
 nodes.get('#invoiceMediaFiles').onchange({target:{files:[new File(['extra'],'photo.jpg',{type:'image/jpeg'})]}});
 await nodes.get('#shareInvoiceMedia').onclick();
 assert.equal(shared.text,'Invoice amount and feedback');assert.equal(shared.files.length,2);assert.ok(shared.files.some(f=>f.name==='invoice.pdf'));assert.ok(shared.files.some(f=>f.name==='photo.jpg'));

});
