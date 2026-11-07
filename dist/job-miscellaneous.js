/* Independent bill lines: never participate in stock or labour commission. */
function miscellaneousTotal(record){return round((record.miscellaneousLines||[]).reduce((sum,line)=>sum+Number(line.qty||0)*Number(line.price||0),0))}
const totalsBeforeMiscellaneous=billTotals;
billTotals=function(record){const result=totalsBeforeMiscellaneous(record),miscellaneous=miscellaneousTotal(record);return {...result,miscellaneous,total:round(result.total+miscellaneous)}};
function renderMiscellaneous(){
 if(jobDraft?.key!=='jobs')return;
 const record=jobDraft.record;record.miscellaneousLines??=[];
 let panel=document.getElementById('jobMiscellaneous');
 if(!panel){
  panel=document.createElement('section');panel.id='jobMiscellaneous';panel.className='jobMiscellaneous';
  const anchor=document.querySelector('#partLines')?.closest('.jobPartScroller')||document.querySelector('#partLines');
  anchor?.after(panel);
 }
 panel.innerHTML='<div class="lineheading" style="font-weight:400">Miscellaneous Items <button type="button" class="btn secondary small" data-misc-add>+ Add Item</button></div><div class="tablewrap"><table><thead><tr><th>Item Name</th><th>Quantity</th><th>Unit Price (₹)</th><th>Total (₹)</th><th></th></tr></thead><tbody>'+record.miscellaneousLines.map((line,i)=>`<tr><td><input data-misc="${i}" data-field="name" value="${esc(line.name||'')}" aria-label="Miscellaneous item name"></td><td><input data-misc="${i}" data-field="qty" type="text" inputmode="numeric" pattern="[0-9]+" value="${line.qty}" aria-label="Miscellaneous quantity"></td><td><input data-misc="${i}" data-field="price" type="number" min="0" step="0.01" value="${line.price}" aria-label="Miscellaneous unit price"></td><td data-misc-total="${i}">${money(Number(line.qty)*Number(line.price))}</td><td><button type="button" class="btn danger small" data-misc-remove="${i}" aria-label="Remove miscellaneous item">×</button></td></tr>`).join('')+'</tbody></table></div>';
 panel.querySelector('[data-misc-add]').onclick=()=>{record.miscellaneousLines.push({name:'',qty:1,price:0});renderMiscellaneous();updateBillTotals()};
 panel.querySelectorAll('[data-misc-remove]').forEach(button=>button.onclick=()=>{record.miscellaneousLines.splice(Number(button.dataset.miscRemove),1);renderMiscellaneous();updateBillTotals()});
 panel.oninput=event=>{
  const input=event.target;if(input.dataset.misc===undefined)return;
  const line=record.miscellaneousLines[Number(input.dataset.misc)],field=input.dataset.field;
  if(field==='qty'&&!/^\d*$/.test(input.value)){input.value=line.qty;return}
  line[field]=field==='name'?input.value:Number(input.value);
  panel.querySelector(`[data-misc-total="${input.dataset.misc}"]`).textContent=money(Number(line.qty)*Number(line.price));
  updateBillTotals();
 };
}
const formBeforeMiscellaneous=billForm;
billForm=function(key,id,initial){const result=formBeforeMiscellaneous(key,id,initial);if(key==='jobs'){renderMiscellaneous();updateBillTotals()}return result};
const updateBeforeMiscellaneous=updateBillTotals;
const breakdownBeforeMiscellaneous=jobBillingBreakdown;
jobBillingBreakdown=function(record){const result=breakdownBeforeMiscellaneous(record),misc=miscellaneousTotal(record);return {...result,subtotal:round(result.subtotal+misc),adjustment:round(result.adjustment-misc)}};
updateBillTotals=function(){const result=updateBeforeMiscellaneous.apply(this,arguments);if(jobDraft?.key==='jobs'){
 const panel=document.getElementById('jobMiscellaneous'),summary=document.querySelector('#billForm .jobGrandSummary');
 if(panel&&summary){
  panel.after(summary);
  let miscellaneousRow=summary.querySelector('[data-misc-grand]');
  if(!miscellaneousRow){miscellaneousRow=document.createElement('p');miscellaneousRow.dataset.miscGrand='';summary.querySelector('.grand')?.before(miscellaneousRow)}
  miscellaneousRow.innerHTML='<span>Grand Total — Miscellaneous Items</span><strong>'+money(miscellaneousTotal(jobDraft.record))+'</strong>';
  const grand=summary.querySelector('.grand');
  if(grand){grand.querySelector('span').textContent='Grand Total — Service + Spare Parts + Miscellaneous Items';grand.querySelector('strong').textContent=money(billTotals(jobDraft.record).total);}
 }
 const totals=document.querySelector('#billForm .jobBillingTotals');
 if(totals){let row=totals.querySelector('[data-misc-summary]');if(!row){row=document.createElement('div');row.dataset.miscSummary='';totals.querySelector('.grand')?.before(row)}row.innerHTML='<span>Miscellaneous Items</span><b>'+money(miscellaneousTotal(jobDraft.record))+'</b>';}
}return result};
document.addEventListener('submit',event=>{
 if(event.target.getAttribute('id')!=='billForm'||jobDraft?.key!=='jobs')return;
 // Read the visible editor at submission, including autofill/paste changes
 // that may not have emitted an input event in the embedded browser.
 const editor=document.getElementById('jobMiscellaneous');
 if(editor){
  jobDraft.record.miscellaneousLines=Array.from(editor.querySelectorAll('tbody tr')).map(row=>({
   name:row.querySelector('[data-field="name"]').value.trim(),
   qty:Number(row.querySelector('[data-field="qty"]').value),
   price:Number(row.querySelector('[data-field="price"]').value)
  }));
 }
 const valid=(jobDraft.record.miscellaneousLines||[]).every(line=>typeof line.name==='string'&&line.name.trim()&&Number.isSafeInteger(line.qty)&&line.qty>=1&&Number.isFinite(line.price)&&line.price>=0&&Number.isFinite(line.qty*line.price));
 if(!valid){event.preventDefault();event.stopImmediatePropagation();toast('Complete miscellaneous item names, whole-number quantities of at least 1, and valid prices.');}
},true);
const modelBeforeMiscellaneous=referenceInvoiceModel;
referenceInvoiceModel=function(key,id){const model=modelBeforeMiscellaneous(key,id),record=find(key,id);model.miscellaneous=(record.miscellaneousLines||[]).map(line=>({name:line.name,qty:line.qty,unit:'',rate:line.price,discount:0,amount:round(line.qty*line.price),gst:0}));model.gross=round(model.gross+miscellaneousTotal(record));model.adjustment=round(model.adjustment-miscellaneousTotal(record));return model};

// Thermal receipts share receiptRows with their existing service/GST renderers.
// Append miscellaneous rows last so their amounts remain untaxed.
if(typeof receiptRows==='function'){
 const receiptRowsBeforeMiscellaneous=receiptRows;
 receiptRows=function(record){return [
  ...receiptRowsBeforeMiscellaneous.apply(this,arguments),
  ...(record.miscellaneousLines||[]).map(line=>({name:line.name,qty:Number(line.qty),rate:Number(line.price),amount:round(Number(line.qty)*Number(line.price))}))
 ]};
}
if(typeof thermalReceiptMarkup==='function'){
 const thermalBeforeMiscellaneous=thermalReceiptMarkup;
 thermalReceiptMarkup=function(key,id,width){
  const html=thermalBeforeMiscellaneous.apply(this,arguments),record=find(key,id);
  if(!record||!record.miscellaneousLines?.length||!html)return html;
  const row='<div class="thermalMiscellaneousTotal"><dt>Miscellaneous Items</dt><dd>'+miscellaneousTotal(record).toFixed(2)+'</dd></div>';
  return html.replace('<div class="thermalBold"><dt>TOTAL</dt>',row+'<div class="thermalBold"><dt>TOTAL</dt>');
 };
}

function miscellaneousReportRows(query='',from='',to=''){
 const text=query.trim().toLowerCase();
 return (db.jobs||[]).flatMap(job=>(job.miscellaneousLines||[]).map(line=>({job,line,customer:name('customers',job.customer),vehicle:number(job.bike)})))
  .filter(row=>(!from||row.job.date>=from)&&(!to||row.job.date<=to)&&[row.job.id,row.customer,row.vehicle,row.line.name,row.job.status].join(' ').toLowerCase().includes(text));
}
function openMiscellaneousReport(){
 openModal('Miscellaneous Items — Job Card Tracking','<div class="formbody"><div class="toolbar"><input id="miscSearch" type="search" placeholder="Search item, job, customer or vehicle" aria-label="Search miscellaneous items"><label>From <input id="miscFrom" type="date"></label><label>To <input id="miscTo" type="date"></label><button type="button" id="miscExport" class="btn secondary">Export CSV</button></div><p>Includes all saved job cards. Cancelled jobs are listed separately and excluded from the active total.</p><div id="miscReportRows"></div><p id="miscReportTotals"></p></div>');
 const rows=()=>miscellaneousReportRows(document.getElementById('miscSearch').value,document.getElementById('miscFrom').value,document.getElementById('miscTo').value);
 const draw=()=>{
  const data=rows();
  document.getElementById('miscReportRows').innerHTML='<div class="tablewrap"><table><thead><tr>'+['Job Card','Date','Customer','Vehicle','Status','Item Name','Quantity','Unit Price','Total'].map(label=>'<th>'+label+'</th>').join('')+'</tr></thead><tbody>'+data.map(({job,line,customer,vehicle})=>'<tr>'+[job.id,job.date,customer,vehicle,job.status,line.name,line.qty,money(line.price),money(round(line.qty*line.price))].map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  const active=data.filter(row=>row.job.status!=='Cancelled');
  const total=list=>money(round(list.reduce((sum,row)=>sum+row.line.qty*row.line.price,0)));
  document.getElementById('miscReportTotals').textContent=data.length+' items · Active total: '+total(active)+' · Cancelled total: '+total(data.filter(row=>row.job.status==='Cancelled'));
 };
 ['miscSearch','miscFrom','miscTo'].forEach(id=>document.getElementById(id).oninput=draw);
 document.getElementById('miscExport').onclick=()=>{
  const cell=value=>'"'+String(value??'').replace(/^[=+@-]/,"'").replaceAll('"','""')+'"';
  const data=[['Job Card','Date','Customer','Vehicle','Status','Item','Quantity','Unit Price','Total'],...rows().map(({job,line,customer,vehicle})=>[job.id,job.date,customer,vehicle,job.status,line.name,line.qty,line.price,round(line.qty*line.price)])];
  download('\ufeff'+data.map(row=>row.map(cell).join(',')).join('\r\n'),'miscellaneous-items.csv','text/csv;charset=utf-8');
 };
 draw();
}
const renderBeforeMiscellaneousReport=render;
function ensureMiscellaneousReportButton(){if(page==='jobs'&&!document.getElementById('miscellaneousReportButton')){
 const button=document.createElement('button');button.id='miscellaneousReportButton';button.className='btn';button.style.background='#245bed';button.style.color='#fff';button.style.borderColor='#245bed';button.textContent='Miscellaneous Items Report';button.onclick=openMiscellaneousReport;
 document.querySelector('#content .toolbar')?.append(button);
}}
render=function(){const result=renderBeforeMiscellaneousReport.apply(this,arguments);ensureMiscellaneousReportButton();return result};
ensureMiscellaneousReportButton();
window.addEventListener('load',ensureMiscellaneousReportButton,{once:true});

// app.js performs its first render before this late-loaded enhancement.
// Re-render after installation so saved miscellaneous rows and totals are restored on refresh.
setTimeout(()=>{try{render()}catch(error){console.warn('Miscellaneous refresh render failed',error)}},0);
