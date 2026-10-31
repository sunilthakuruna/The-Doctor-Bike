/* Sales display: keep editable base price, show GST-inclusive unit rate, and make final amount order clear. */
function salesRateAfterAmount(){
 if(jobDraft?.key!=='sales')return;
 const table=document.querySelector('#partLines table');if(!table)return;
 const header=table.tHead?.rows[0]||table.rows[0];if(!header)return;
 const rateIndex=Array.from(header.cells).findIndex(c=>/Sale Rate/.test(c.textContent));
 const gstIndex=Array.from(header.cells).findIndex(c=>/GST/.test(c.textContent));
 const discountIndex=Array.from(header.cells).findIndex(c=>/Item Discount/.test(c.textContent));
 const amountIndex=Array.from(header.cells).findIndex(c=>c.textContent.includes('Amount'));
 if(rateIndex<0||gstIndex<0||discountIndex<0||amountIndex<0)return;
 const rateHead=header.cells[rateIndex],gstHead=header.cells[gstIndex],discountHead=header.cells[discountIndex],amountHead=header.cells[amountIndex];
 rateHead.textContent='Sale Rate per Unit (₹)';amountHead.textContent='Final Amount (₹)';
 if(rateHead!==gstHead.previousElementSibling)header.insertBefore(rateHead,gstHead);
 if(discountHead!==amountHead.previousElementSibling)header.insertBefore(discountHead,amountHead);
 for(const row of Array.from(table.rows).slice(1)){
  const rateCell=row.cells[rateIndex],gstCell=row.cells[gstIndex],discountCell=row.cells[discountIndex],amountCell=row.cells[amountIndex];
  if(rateCell&&gstCell&&rateCell!==gstCell.previousElementSibling)row.insertBefore(rateCell,gstCell);
  if(discountCell&&amountCell&&discountCell!==amountCell.previousElementSibling)row.insertBefore(discountCell,amountCell);
  if(!rateCell)continue;
  let hint=rateCell.querySelector('[data-sale-gross-rate]');
  if(!hint){hint=document.createElement('small');hint.dataset.saleGrossRate='';hint.className='saleGrossRate';rateCell.appendChild(hint)}
  const input=rateCell.querySelector('[data-partfield$="|price"]');
  const index=Number(input?.dataset.partfield?.split('|')[0]);
  const line=jobDraft.record.partLines[index];
  const tax=jobDraft.record.invoiceType==='non-gst'?0:Number(line?.gst||0);
  hint.textContent=(jobDraft.record.invoiceType==='non-gst'?'Final rate: ':'Rate incl. GST: ')+money(Number(line?.price||0)*(1+tax/100));
 }
}function refreshSalesRateSummary(){
 if(jobDraft?.key!=='sales')return;
 const totals=document.querySelector('#billForm .totals');if(!totals)return;
 let box=totals.querySelector('.salesSaleBreakdown');
 if(!box){box=document.createElement('div');box.className='salesSaleBreakdown';const taxRow=document.getElementById('sumTax')?.parentElement;totals.insertBefore(box,taxRow?.nextSibling||totals.querySelector('.grand'));}
 const b=jobDraft.record,d=splitDiscounts(b),t=billTotals(b),gross=Number(d.parts||0),discount=Number(d.part||0)+Number(b.discount||0),taxable=Math.max(0,gross-discount);
 const row=(label,value)=>'<p><span>'+label+'</span><strong>'+esc(value)+'</strong></p>';
 box.innerHTML=row('Sale value before GST',money(gross))+row('Total discount',money(discount))+row('Taxable sale amount',money(taxable))+row('GST on sale',money(t.tax))+row('Final sale amount (incl. GST)',money(t.total));
}
const salesRateLineRenderBefore=lineRender;
lineRender=function(){const result=salesRateLineRenderBefore.apply(this,arguments);salesRateAfterAmount();refreshSalesRateSummary();return result};
const salesRateTotalsBefore=updateBillTotals;
updateBillTotals=function(){const result=salesRateTotalsBefore.apply(this,arguments);salesRateAfterAmount();refreshSalesRateSummary();return result};
const salesRateStyle=document.createElement('style');
salesRateStyle.textContent='#billForm .saleGrossRate{display:block;margin-top:3px;color:#64748b;font-size:10px;white-space:nowrap}#billForm .itemDiscountCell{min-width:160px;white-space:nowrap}#billForm .discountModeToggle{display:inline-flex;vertical-align:middle;margin-right:4px}#billForm .discountModeToggle button{width:30px;height:32px;min-height:32px;padding:4px;border:1px solid #cbd5e1;background:#fff;color:#334155;font-weight:700;line-height:1}#billForm .discountModeToggle button+button{border-left:0}#billForm .discountModeToggle button.active{background:#2563eb;border-color:#2563eb;color:#fff}#billForm .discountModeToggle button:focus-visible{position:relative;z-index:1}#billForm .itemDiscountCell input{display:inline-block;width:74px;min-width:74px;margin-left:0;padding:7px 8px;font-size:12px}#billForm .salesSaleBreakdown{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-column:1/-1;gap:4px 16px;padding:7px 0;border-top:1px solid #dbe2ea;border-bottom:1px solid #dbe2ea}#billForm .salesSaleBreakdown p{display:flex;justify-content:space-between;gap:8px;margin:0;font-size:11px;color:#52627a}#billForm .salesSaleBreakdown strong{white-space:nowrap;color:#334155}';
document.head.appendChild(salesRateStyle);