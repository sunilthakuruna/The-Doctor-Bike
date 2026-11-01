/* Read-only breakdown of the existing Job Card calculations. */
function jobBillingBreakdown(b){
  const discounts=splitDiscounts(b),totals=billTotals(b);
  const labourDiscount=Number(discounts.service||0),partsDiscount=Number(discounts.part||0),otherDiscount=Number(b.discount||0);
  const labourNet=Math.max(0,Number(discounts.labour||0)-labourDiscount),partsNet=Math.max(0,Number(discounts.parts||0)-partsDiscount);
  const beforeOther=labourNet+partsNet,factor=beforeOther?Math.max(0,beforeOther-otherDiscount)/beforeOther:0;
  const subtotal=round(Math.max(0,beforeOther-otherDiscount)),netLabour=round(labourNet*factor),netParts=round(subtotal-netLabour);
  const nonGst=b.invoiceType==='non-gst';
  const labourRateSource=nonGst?'Disabled for Non-GST invoice':'Assigned Services / Labour GST column';
  const partRates=[...new Set((b.partLines||[]).map(line=>Number(line.gst||0)))].sort((a,b)=>a-b);
  const serviceRates=typeof serviceGstRates==='function'?serviceGstRates(b):[Number(b.tax||0)];
  const itemNetParts=(b.partLines||[]).reduce((sum,line)=>sum+Math.max(0,Number(line.qty||0)*Number(line.price||0)-Number(line.discount||0)*(line.discountType==='percent'?Number(line.qty||0)*Number(line.price||0)/100:1)),0);
  const partsTaxBase=(b.partLines||[]).reduce((sum,line)=>{const gross=Number(line.qty||0)*Number(line.price||0),discount=Number(line.discount||0)*(line.discountType==='percent'?gross/100:1);return sum+Math.max(0,gross-discount)*Number(line.gst||0)/100},0);
  const partsTax=nonGst?0:(itemNetParts?partsTaxBase*netParts/itemNetParts:0)*factor;
  const labourTax=nonGst?0:(typeof serviceTaxAfterDiscounts==='function'?serviceTaxAfterDiscounts(b,factor):netLabour*Number(b.tax||0)/100);
  return {labourDiscount:round(labourDiscount),partsDiscount:round(partsDiscount),otherDiscount:round(otherDiscount),totalDiscount:round(labourDiscount+partsDiscount+otherDiscount),netLabour,netParts,netLabourWithGst:round(netLabour+labourTax),netPartsWithGst:round(netParts+partsTax),subtotal,tax:Number(totals.tax||0),roundOff:Number(b.paymentRoundOff||0),adjustment:round(Number(totals.total||0)-subtotal-Number(totals.tax||0)-Number(b.paymentRoundOff||0)),nonGst,labourRate:nonGst?'Not applicable':serviceRates.length?serviceRates.map(rate=>rate+'%').join(', '):'No services',labourRateSource,partsRates:nonGst?'Not applicable':partRates.length?partRates.map(rate=>rate+'%').join(', '):'No spare parts'};
}
function refreshJobBillingBreakdown(){
  if(jobDraft?.key!=='jobs')return;
  const totals=document.querySelector('#billForm .jobBillingTotals');if(!totals)return;
  const d=jobBillingBreakdown(jobDraft.record);
  for(const [id,label] of [['sumLabour','Total labour / service (before discount)'],['sumParts','Total spare parts (before discount)']]){
    const title=document.getElementById(id)?.parentElement?.querySelector('span');if(title)title.textContent=label;
  }
  let box=totals.querySelector('.jobChargeBreakdown');
  if(!box){box=document.createElement('div');box.className='jobChargeBreakdown';const taxRow=document.getElementById('sumTax')?.parentElement;totals.insertBefore(box,taxRow||totals.querySelector('.grand'));}
  const row=(label,value,wide=false)=>'<p'+(wide?' class=\"wide\"':'')+'><span>'+label+'</span><strong>'+esc(value)+'</strong></p>';
  const column=(title,rows)=>'<div class=\"breakdownColumn\"><h4>'+title+'</h4>'+rows+'</div>';
  const serviceDetails=row('Discount',money(d.labourDiscount))+row('Net before GST',money(d.netLabour))+row('GST source',d.labourRateSource)+row('GST rates',d.labourRate)+row('Net after discount + GST',money(d.netLabourWithGst));
  const partsDetails=row('Discount',money(d.partsDiscount))+row('Net before GST',money(d.netParts))+row('GST rates',d.partsRates)+row('Net after discount + GST',money(d.netPartsWithGst));
  const serviceTotal=round(d.netLabourWithGst),partsTotal=round(d.netPartsWithGst),grandTotal=Number(d.tax||0)+Number(d.subtotal||0)+Number(d.roundOff||0)+Number(d.adjustment||0);
  box.innerHTML=column('Labour / Service',serviceDetails)+column('Spare Parts',partsDetails)+(d.otherDiscount?row('Additional discount',money(d.otherDiscount),true):'')+row('Total discount (Labour + Spare Parts)',money(d.totalDiscount),true)+row('Subtotal after all discounts',money(d.subtotal),true)+(d.roundOff?row('Payment rounding',money(d.roundOff),true):'')+(d.adjustment?row('Saved bill adjustment',money(d.adjustment),true):'')+`<div class="jobGrandSummary"><p><span>Grand Total — Service</span><strong>${money(serviceTotal)}</strong></p><p><span>Grand Total — Spare Parts</span><strong>${money(partsTotal)}</strong></p><p class="grand"><span>Grand Total — Service + Spare Parts</span><strong>${money(grandTotal)}</strong></p></div>`;
  const partSection=document.querySelector('#partLines')?.closest('.jobPartScroller');
  const grandSummary=box.querySelector('.jobGrandSummary');
  if(partSection&&grandSummary)partSection.after(grandSummary);
}
const updateBeforeJobBillingBreakdown=updateBillTotals;
updateBillTotals=function(){const result=updateBeforeJobBillingBreakdown.apply(this,arguments);refreshJobBillingBreakdown();return result;};
const formBeforeJobBillingBreakdown=billForm;
billForm=function(key,id,initial){const result=formBeforeJobBillingBreakdown(key,id,initial);if(key==='jobs')refreshJobBillingBreakdown();return result;};
const jobBreakdownStyle=document.createElement('style');
jobBreakdownStyle.textContent='#billForm .jobBillingTotals>.jobChargeBreakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-column:1/-1;gap:8px 18px;padding:8px 0;border-top:1px solid #d8e2ef;border-bottom:1px solid #d8e2ef}#billForm .jobChargeBreakdown>.breakdownColumn{display:grid;gap:4px}#billForm .jobChargeBreakdown h4{margin:0 0 2px;padding-bottom:4px;border-bottom:1px solid #d8e2ef;color:#1e293b;font-size:10px;letter-spacing:.04em;text-transform:uppercase}#billForm .jobChargeBreakdown p{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:0;padding:2px 0;font-size:11px;line-height:1.4;color:#52627a}#billForm .jobChargeBreakdown strong{white-space:nowrap;font-size:11px;color:#34445b}#billForm .jobChargeBreakdown>p.wide{grid-column:1/-1}.jobGrandSummary{display:block;width:100%;box-sizing:border-box;margin:10px 0;padding:7px 10px;border:1px solid #93c5fd;background:#eff6ff;border-radius:4px}.jobGrandSummary p{display:flex;justify-content:space-between;gap:10px;margin:0;padding:2px 0;font-weight:700;color:#1e3a8a}.jobGrandSummary strong{white-space:nowrap}.jobGrandSummary .grand{margin-top:4px;padding-top:6px;border-top:1px solid #93c5fd;font-size:13px;color:#0f172a}';
document.head.appendChild(jobBreakdownStyle);




