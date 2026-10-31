function validateSplitDiscounts(b){let d=splitDiscounts(b);for(let [value,type,base,label]of [[b.serviceDiscount,b.serviceDiscountType,d.labour,'Service'],[b.partsDiscount,b.partsDiscountType,d.parts,'Spare parts']]){let n=Number(value||0);if(!Number.isFinite(n)||n<0||type==='percent'&&n>100||type!=='percent'&&n>base)throw Error(label+' discount exceeds its subtotal or valid percentage.')}if(Number(b.discount||0)>d.labour+d.parts-d.service-d.part)throw Error('Additional discount exceeds the remaining subtotal.');return d}
const totalsBeforeSplitDiscount=billTotals;
billTotals=function(b){if(!Number(b.serviceDiscount||0)&&!Number(b.partsDiscount||0))return totalsBeforeSplitDiscount(b);let d=splitDiscounts(b),service=Math.max(0,d.labour-d.service),parts=Math.max(0,d.parts-d.part),after=service+parts,additional=Number(b.discount||0),factor=after?Math.max(0,after-additional)/after:0,partTax=(b.partLines||[]).reduce((s,l)=>s+Number(l.qty||0)*Number(l.price||0)*Number(l.gst||0)/100,0),tax=b.invoiceType==='non-gst'?0:round((service*Number(b.tax||0)/100+(d.parts?partTax*parts/d.parts:0))*factor);return {labour:round(d.labour),parts:round(d.parts),tax,total:round(Math.max(0,after-additional)+tax)}};
const signatureBeforeSplitDiscount=billingSignature;
billingSignature=function(b){let original=signatureBeforeSplitDiscount(b);return Number(b.serviceDiscount||0)||Number(b.partsDiscount||0)?original+JSON.stringify([Number(b.serviceDiscount||0),b.serviceDiscountType||'amount',Number(b.partsDiscount||0),b.partsDiscountType||'amount']):original};
function addSplitDiscountFields(){}
const billBeforeSplitDiscount=billForm;
billForm=function(key,id,initial){billBeforeSplitDiscount(key,id,initial);addSplitDiscountFields()};
const updateBeforeSplitDiscount=updateBillTotals;
updateBillTotals=function(){if(jobDraft)for(let key of ['serviceDiscount','serviceDiscountType','partsDiscount','partsDiscountType']){let input=$('#billForm [name="'+key+'"]');if(input)jobDraft.record[key]=key.endsWith('Type')?input.value:Number(input.value||0)}updateBeforeSplitDiscount()};
const saveBeforeSplitDiscount=saveBill;
saveBill=function(e){if(jobDraft&&jobDraft.key!=='purchases'){updateBillTotals();try{validateSplitDiscounts(jobDraft.record)}catch(err){e.preventDefault();toast(err.message);return}}return saveBeforeSplitDiscount(e)};
const invoiceBeforeSplitDiscount=invoice;
invoice=function(key,id){invoiceBeforeSplitDiscount(key,id);let b=find(key,id);if(!b)return;let d=splitDiscounts(b);if(d.service||d.part){let total=$('#modalBody .invoicetotal');if(total)total.insertAdjacentHTML('beforeend',`<p><span>Service discount</span><b>${money(d.service)}</b></p><p><span>Parts discount</span><b>${money(d.part)}</b></p><p><span>Additional discount</span><b>${money(b.discount||0)}</b></p>`);}};
