const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'../dist',file),'utf8');
function setup(lines,invoiceType='non-gst'){
 const record={id:'job-1',date:'2026-11-07',invoiceType,serviceLines:[{name:'Labour',charge:200,gst:0}],partLines:[],miscellaneousLines:lines};
 const round=value=>Math.round(value*100)/100,total=()=>round(200+lines.reduce((sum,line)=>sum+line.qty*line.price,0));
 const context={db:{settings:{name:'Garage'}},find:(key,id)=>key==='jobs'&&id===record.id?record:null,invoiceTypeOf:record=>record.invoiceType,round,money:value=>'Rs '+value.toFixed(2),name:()=> 'Labour',number:()=>'',validInvoiceImage:()=>false,splitDiscounts:()=>({service:0,part:0}),billTotals:()=>({labour:200,parts:0,tax:0,total:total()}),paid:()=>100,due:()=>total()-100,miscellaneousTotal:record=>round(record.miscellaneousLines.reduce((sum,line)=>sum+line.qty*line.price,0)),receiptRows:()=>[{name:'Labour',qty:1,rate:200,amount:200}],esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')};
 vm.createContext(context);
 const source=read('attachments.js');vm.runInContext(source.slice(source.indexOf('function thermalReceiptMarkup('),source.indexOf('function openThermalInvoice(')),context);
 vm.runInContext(read('thermal-gst-breakdown.js'),context);
 const miscellaneous=read('job-miscellaneous.js');vm.runInContext(miscellaneous.slice(miscellaneous.indexOf('// Thermal receipts share'),miscellaneous.indexOf('function miscellaneousReportRows(')),context);
 return width=>context.thermalReceiptMarkup('jobs','job-1',width);
}
for(const width of [58,80])test(width+'mm thermal receipt includes miscellaneous item and correct total once',()=>{
 const html=setup([{name:'Outside repair <item>',qty:5,price:50}])(width);
 assert.match(html,/Outside repair &lt;item&gt;/);assert.match(html,/5 × 50\.00/);assert.match(html,/<dt>Miscellaneous Items<\/dt><dd>250\.00/);assert.match(html,/<dt>TOTAL<\/dt><dd>450\.00/);assert.match(html,/<dt>BALANCE<\/dt><dd>350\.00/);assert.equal((html.match(/Outside repair/g)||[]).length,1);
});
test('multiple miscellaneous items appear and do not enter GST breakdown',()=>{
 const html=setup([{name:'Outside work',qty:2,price:100},{name:'Delivery',qty:1,price:50}],'gst')(80);
 assert.match(html,/Outside work/);assert.match(html,/Delivery/);assert.match(html,/<dt>TOTAL<\/dt><dd>450\.00/);
 const tax=html.split('GST DETAILS')[1];assert.doesNotMatch(tax,/Outside work|Delivery/);
});
test('receipts without miscellaneous items have no extra summary row',()=>{const html=setup([])(58);assert.doesNotMatch(html,/thermalMiscellaneousTotal/);assert.match(html,/<dt>TOTAL<\/dt><dd>200\.00/)});
