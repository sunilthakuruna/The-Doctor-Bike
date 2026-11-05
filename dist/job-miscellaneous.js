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
updateBillTotals=function(){const result=updateBeforeMiscellaneous.apply(this,arguments);if(jobDraft?.key==='jobs'){
 const totals=document.querySelector('#billForm .jobBillingTotals');
 if(totals){let row=totals.querySelector('[data-misc-summary]');if(!row){row=document.createElement('div');row.dataset.miscSummary='';totals.querySelector('.grand')?.before(row)}row.innerHTML='<span>Miscellaneous Items</span><b>'+money(miscellaneousTotal(jobDraft.record))+'</b>';}
}return result};
document.addEventListener('submit',event=>{
 if(event.target.getAttribute('id')!=='billForm'||jobDraft?.key!=='jobs')return;
 const valid=(jobDraft.record.miscellaneousLines||[]).every(line=>typeof line.name==='string'&&line.name.trim()&&Number.isSafeInteger(line.qty)&&line.qty>=1&&Number.isFinite(line.price)&&line.price>=0&&Number.isFinite(line.qty*line.price));
 if(!valid){event.preventDefault();event.stopImmediatePropagation();toast('Complete miscellaneous item names, whole-number quantities of at least 1, and valid prices.');}
},true);
const modelBeforeMiscellaneous=referenceInvoiceModel;
referenceInvoiceModel=function(key,id){const model=modelBeforeMiscellaneous(key,id),record=find(key,id);model.miscellaneous=(record.miscellaneousLines||[]).map(line=>({name:line.name,qty:line.qty,unit:'',rate:line.price,discount:0,amount:round(line.qty*line.price),gst:0}));model.gross=round(model.gross+miscellaneousTotal(record));model.adjustment=round(model.adjustment-miscellaneousTotal(record));return model};
