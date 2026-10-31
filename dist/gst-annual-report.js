/* Annual GST workpaper: summarizes only information recorded in this browser prototype. */
if(!titles['report-gst'])titles['report-gst']='GST Annual Report';

function gstReportFinancialYears(){
  const years=new Set();
  const dates=[...(db.jobs||[]),...(db.sales||[]),...(db.purchases||[])].map(record=>record.date).filter(value=>/^\d{4}-\d{2}-\d{2}$/.test(value));
  const now=new Date(),currentFy=now.getFullYear()-(now.getMonth()<3?1:0);
  years.add(currentFy);
  for(const value of dates){const date=new Date(value+'T00:00:00');years.add(date.getFullYear()-(date.getMonth()<3?1:0))}
  return [...years].sort((a,b)=>b-a);
}
function gstFyRange(year){return {from:year+'-04-01',to:(year+1)+'-03-31'}}
function gstRowsForFinancialYear(){
  const range=gstFyRange(gstSelectedFy);
  const isInRange=record=>record?.status!=='Cancelled'&&record?.date>=range.from&&record?.date<=range.to;
  const outward=[...(db.jobs||[]),...(db.sales||[])].filter(isInRange);
  const inward=(db.purchases||[]).filter(isInRange);
  return {range,outward,inward};
}
let gstSelectedFy=gstReportFinancialYears()[0];
function gstNumber(value){const n=Number(value);return Number.isFinite(n)?n:0}
function gstLineValue(line,kind){return Math.max(0,Number(kind==='service'?line.charge||0:Number(line.qty||0)*Number(line.price||0))-(typeof itemDiscount==='function'?itemDiscount(line,kind):0))}
function gstOutwardBreakdown(b){
  const totals=billTotals(b),details=[];
  if(b.invoiceType==='non-gst')return {taxable:Math.max(0,Number(totals.total||0)-Number(totals.tax||0)),tax:Number(totals.tax||0),lines:[],nonGst:true,unknown:false};
  const discounts=typeof splitDiscounts==='function'?splitDiscounts(b):{labour:0,parts:0,service:0,part:0};
  const serviceLines=b.serviceLines||[],partLines=b.partLines||[];
  const serviceItemNet=serviceLines.reduce((s,line)=>s+gstLineValue(line,'service'),0),partItemNet=partLines.reduce((s,line)=>s+gstLineValue(line,'part'),0);
  const serviceAfter=Math.max(0,Number(discounts.labour||0)-Number(discounts.service||0)),partsAfter=Math.max(0,Number(discounts.parts||0)-Number(discounts.part||0));
  const afterSpecific=serviceAfter+partsAfter,globalFactor=afterSpecific?Math.max(0,afterSpecific-Number(b.discount||0))/afterSpecific:0;
  const serviceFactor=serviceItemNet?serviceAfter/serviceItemNet:0,partFactor=partItemNet?partsAfter/partItemNet:0;
  const push=(line,kind)=>{
    const base=gstLineValue(line,kind)*(kind==='service'?serviceFactor:partFactor)*globalFactor;
    const part=kind==='part'?find('parts',line.part):null;
    const rate=b.invoiceType==='non-gst'?0:(kind==='service'?(typeof serviceGstRate==='function'?serviceGstRate(line,b):gstNumber(line.gst??b.tax)):gstNumber(line.gst));
    details.push({kind,rate,base:Math.max(0,base),tax:Math.max(0,base)*rate/100,name:line.name||(kind==='service'?name('services',line.service):part?.name||name('parts',line.part)),code:kind==='part'?(line.hsn||part?.hsn||''):'',partType:kind==='part'?(line.partType||part?.partType||''):'',qty:kind==='part'?gstNumber(line.qty):1});
  };
  serviceLines.forEach(line=>push(line,'service'));partLines.forEach(line=>push(line,'part'));
  const tax=Number(totals.tax||0),lineTax=round(details.reduce((s,line)=>s+line.tax,0));
  const taxable=round(details.reduce((s,line)=>s+line.base,0));
  const hasType=!!b.invoiceType,hasTaxEvidence=tax>0||details.some(line=>line.rate>0);
  return {taxable,tax,lines:details,nonGst:false,unknown:!hasType&&!hasTaxEvidence,reconciliation:round(tax-lineTax)};
}
function gstPurchaseBreakdown(b){
  const lines=(b.partLines||[]).map(line=>{
    const part=find('parts',line.part),rate=b.invoiceType==='non-gst'?0:gstNumber(line.gst);
    const gross=Math.max(0,gstNumber(line.qty)*gstNumber(line.price));
    const discount=Number(b.discount||0),recordBase=(b.partLines||[]).reduce((s,item)=>s+Math.max(0,gstNumber(item.qty)*gstNumber(item.price)),0);
    const taxable=recordBase?Math.max(0,gross-discount*gross/recordBase):0;
    const tax=b.invoiceType==='non-gst'?0:(typeof purchaseLineGst==='function'?purchaseLineGst(b,line):round(taxable*rate/100));
    return {kind:'Purchase',rate,base:taxable,tax,name:line.name||part?.name||name('parts',line.part),code:line.hsn||part?.hsn||'',partType:line.partType||part?.partType||'',qty:gstNumber(line.qty)};
  });
  return {lines,taxable:round(lines.reduce((s,line)=>s+line.base,0)),tax:round(lines.reduce((s,line)=>s+line.tax,0))};
}
function gstReportData(){
  const {range,outward,inward}=gstRowsForFinancialYear(),documents=[],outRates=new Map(),inRates=new Map(),hsn=new Map();
  let outTaxable=0,outTax=0,inTaxable=0,inTax=0,nonGstCount=0,unknownCount=0,reconciliation=0;
  const addRate=(map,line,docId,party,date,category)=>{const key=String(line.rate??0)+'|'+category;let row=map.get(key);if(!row){row={rate:Number(line.rate||0),category,taxable:0,tax:0,lines:0};map.set(key,row)}row.taxable+=Number(line.base||0);row.tax+=Number(line.tax||0);row.lines++;if(category==='Goods'&&line.code){const hkey=[line.code,row.rate].join('|');let h=hsn.get(hkey);if(!h){h={code:line.code,rate:row.rate,description:line.name||'',qty:0,taxable:0,tax:0,documents:new Set()};hsn.set(hkey,h)}h.qty+=Number(line.qty||0);h.taxable+=Number(line.base||0);h.tax+=Number(line.tax||0);h.documents.add(docId)}};
  outward.forEach(b=>{
    const calc=gstOutwardBreakdown(b),type=calc.nonGst?'Non-GST':((db.jobs||[]).includes(b)?'Job Card':'Counter Sale'),party=b.customer?name('customers',b.customer):b.walkin||'Walk-in Customer';
    if(calc.nonGst)nonGstCount++;if(calc.unknown)unknownCount++;
    const eligible=!calc.nonGst;
    outTaxable+=calc.taxable;outTax+=calc.tax;reconciliation+=Number(calc.reconciliation||0);
    calc.lines.forEach(line=>addRate(outRates,line,b.id,party,b.date,line.kind==='part'?'Goods':'Services'));
    documents.push({date:b.date,id:b.id,type,party,gstin:find('customers',b.customer)?.gst||b.gstin||'',invoice:b.invoice||'',taxable:calc.taxable,tax:calc.tax,total:Number(billTotals(b).total||0),status:calc.unknown?'GST type not recorded':calc.nonGst?'Non-GST':'Reconcile invoice & portal'});
  });
  inward.forEach(b=>{
    const calc=gstPurchaseBreakdown(b);inTaxable+=calc.taxable;inTax+=calc.tax;
    calc.lines.forEach(line=>addRate(inRates,line,b.id,b.supplier||'',b.date,'Goods'));
    documents.push({date:b.date,id:b.id,type:b.invoiceType==='non-gst'?'Non-GST purchase':'Supplier purchase',party:b.supplier||'—',gstin:b.supplierGstin||b.gstin||'',invoice:b.invoice||'',taxable:calc.taxable,tax:calc.tax,total:Number(billTotals(b).total||0),status:'Supplier GST recorded; reconcile eligibility'});
  });
  documents.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.id).localeCompare(String(b.id)));
  return {range,outward,inward,documents,outRates:[...outRates.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.rate-b.rate),inRates:[...inRates.values()].sort((a,b)=>a.rate-b.rate),hsn:[...hsn.values()].sort((a,b)=>a.code.localeCompare(b.code)||a.rate-b.rate),outTaxable:round(outTaxable),outTax:round(outTax),inTaxable:round(inTaxable),inTax:round(inTax),nonGstCount,unknownCount,reconciliation:round(reconciliation)};
}
function gstAnnualReportPage(){
  const data=gstReportData(),financialYears=gstReportFinancialYears(),fyLabel='FY '+gstSelectedFy+'–'+String(gstSelectedFy+1).slice(-2);
  const outwardTaxRows=data.outRates.map(row=>[esc(row.category),row.rate+'%',money(round(row.taxable)),money(round(row.tax)),row.lines]);
  const inwardTaxRows=data.inRates.map(row=>[esc(row.category),row.rate+'%',money(round(row.taxable)),money(round(row.tax)),row.lines]);
  const hsnRows=data.hsn.map(row=>[esc(row.code),esc(row.description),row.rate+'%',row.qty,money(round(row.taxable)),money(round(row.tax)),row.documents.size]);
  const documentRows=data.documents.filter(row=>matches({...row,name:row.party})).map(row=>[esc(row.date),esc(row.id),badge(row.type),esc(row.party),esc(row.gstin||'Not recorded'),esc(row.invoice||'—'),money(row.taxable),money(row.tax),money(row.total),esc(row.status)]);
  const missingData=`<section class="panel gstReportNotice"><div class="panelhead"><h3>Filing checks and data limits</h3></div><div class="panelbody"><p>This is an annual reconciliation workpaper based on records stored in this prototype. It is not a GST return and cannot confirm filing compliance.</p><ul><li>Supplier GSTIN, place of supply, CGST/SGST/IGST split, reverse-charge details, ITC eligibility/reversals, credit/debit notes and tax payment/challan data are not consistently captured here.</li><li>Supplier GST shown is recorded invoice GST only. It is not an approved ITC amount and must be matched with supplier invoices and GST portal records.</li><li>Service SAC codes and complete HSN coverage may be missing. Add or verify them before using the HSN summary.</li><li>${data.unknownCount} outward record(s) do not clearly identify GST vs Non-GST invoice type and need review.</li><li>Rate-wise calculated outward GST is compared with saved invoice tax. Reconciliation difference: <strong>${money(data.reconciliation)}</strong>.</li></ul><p>Review with your tax practitioner and reconcile against GST portal ledgers before filing.</p></div></section>`;
  return `<div class="intro"><h2>GST Annual Report</h2><p>Financial-year GST reconciliation from saved job cards, counter sales, and supplier purchase entries.</p></div>`+
    `<section class="panel gstReportControls"><div class="panelbody"><label>Financial year <select id="gstFinancialYear">${financialYears.map(year=>`<option value="${year}" ${year===gstSelectedFy?'selected':''}>FY ${year}–${String(year+1).slice(-2)} (1 Apr ${year}–31 Mar ${year+1})</option>`).join('')}</select></label><span>Selected period: <strong>${data.range.from}</strong> to <strong>${data.range.to}</strong></span><span class="spacer"></span><button type="button" class="btn secondary" data-gst-print>Print report</button><button type="button" class="btn success" data-gst-export>Export GST report</button></div></section>`+
    summary([['OUTWARD TAXABLE VALUE',money(data.outTaxable)],['OUTPUT GST (SAVED BILLS)',money(data.outTax)],['PURCHASE VALUE (BEFORE GST)',money(data.inTaxable)],['SUPPLIER GST RECORDED',money(data.inTax)]])+ 
    `<div class="notice gstReportCaveat">Supplier GST is shown for reconciliation only. Do not treat it as eligible input tax credit or a final tax payable figure without checking supporting documents and portal records.</div>`+
    `<section class="panel"><div class="panelhead"><h3>Outward supplies by GST rate</h3></div>${table(['Supply type','GST rate','Taxable value','Calculated GST','Lines'],outwardTaxRows)}</section>`+
    `<section class="panel"><div class="panelhead"><h3>Supplier purchases by GST rate</h3></div>${table(['Purchase type','GST rate','Taxable value','Supplier GST recorded','Lines'],inwardTaxRows)}</section>`+
    `<section class="panel"><div class="panelhead"><h3>Outward goods HSN summary</h3></div>${table(['HSN','Description','GST rate','Quantity','Taxable value','GST','Documents'],hsnRows)}</section>`+
    `<section class="panel"><div class="panelhead"><h3>Annual document register · ${fyLabel}</h3><span>${data.documents.length} documents · ${data.nonGstCount} Non-GST bills</span></div>${table(['Date','Record ID','Document type','Party','GSTIN','Invoice no.','Taxable value','GST recorded','Gross total','Review status'],documentRows)}</section>`+missingData;
}
const gstReportOriginalPage=reportPage;
reportPage=function(){return page==='report-gst'?gstAnnualReportPage():gstReportOriginalPage.apply(this,arguments)};
function gstReportCsvEscape(value){return '"'+String(value??'').replace(/"/g,'""')+'"'}
function exportGstAnnualReport(){
  const data=gstReportData(),rows=[
    ['BIKE DOCTOR — GST ANNUAL RECONCILIATION','FY '+gstSelectedFy+'–'+String(gstSelectedFy+1).slice(-2)],
    ['Period',data.range.from,data.range.to],[],
    ['SUMMARY','Taxable value','GST / tax recorded'],
    ['Outward supplies',data.outTaxable,data.outTax],
    ['Supplier purchases',data.inTaxable,data.inTax],
    ['Supplier GST is informational only; ITC eligibility must be reconciled separately.'],[],
    ['OUTWARD RATE SUMMARY','Supply type','Rate','Taxable value','Calculated GST','Lines'],
    ...data.outRates.map(row=>['Outward',row.category,row.rate+'%',round(row.taxable),round(row.tax),row.lines]),[],
    ['PURCHASE RATE SUMMARY','Supply type','Rate','Taxable value','Supplier GST recorded','Lines'],
    ...data.inRates.map(row=>['Purchase',row.category,row.rate+'%',round(row.taxable),round(row.tax),row.lines]),[],
    ['OUTWARD HSN SUMMARY','HSN','Description','Rate','Quantity','Taxable value','GST','Documents'],
    ...data.hsn.map(row=>['Goods',row.code,row.description,row.rate+'%',row.qty,round(row.taxable),round(row.tax),row.documents.size]),[],
    ['DOCUMENT REGISTER','Date','Record ID','Type','Party','GSTIN','Invoice No.','Taxable value','GST recorded','Gross total','Review status'],
    ...data.documents.map(row=>['',row.date,row.id,row.type,row.party,row.gstin||'Not recorded',row.invoice,round(row.taxable),round(row.tax),round(row.total),row.status]),[],
    ['FILING NOTE','Workpaper only. Reconcile supplier GSTIN, place of supply, CGST/SGST/IGST, reverse charge, eligible/reversed ITC, notes, tax payment and portal data before filing.'],
    ['Outward GST reconciliation difference',data.reconciliation],['Unspecified GST invoice type records',data.unknownCount]
  ];
  download('\ufeff'+rows.map(row=>row.map(gstReportCsvEscape).join(',')).join('\r\n'),`bike-doctor-gst-annual-FY-${gstSelectedFy}-${gstSelectedFy+1}.csv`,'text/csv;charset=utf-8');
  toast('GST annual report exported as an Excel-compatible CSV.');
}
function printGstAnnualReport(){
  const content=document.querySelector('#content');if(!content)return;
  const win=window.open('','_blank');if(!win)return toast('Allow the print window, then choose Print / Save PDF.');
  const clone=content.cloneNode(true);clone.querySelector('.gstReportControls')?.remove();clone.querySelector('#search')?.remove();
  win.document.write('<!doctype html><html><head><title>GST Annual Report</title><meta charset="utf-8"><style>body{font:12px Arial,sans-serif;color:#172033;margin:20px}h2,h3{margin:10px 0}p{line-height:1.45}.panel{border:1px solid #ccd5e1;margin:12px 0;padding:10px;break-inside:avoid}.panelhead{font-weight:bold;margin-bottom:8px}table{width:100%;border-collapse:collapse;margin:8px 0 14px}th{background:#172033;color:#fff;text-align:left}th,td{border:1px solid #ccd5e1;padding:5px;font-size:10px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.stat{border:1px solid #ccd5e1;padding:8px}.statvalue{font-size:16px;font-weight:bold}.notice{background:#fff8e7;border:1px solid #edce75;padding:9px}@page{size:A4 landscape;margin:12mm}</style></head><body>'+clone.innerHTML+'<script>window.onload=()=>window.print()<\/script></body></html>');win.document.close();
}
document.addEventListener('change',event=>{if(event.target?.id!=='gstFinancialYear')return;gstSelectedFy=Number(event.target.value)||gstReportFinancialYears()[0];const range=gstFyRange(gstSelectedFy);reportFrom=range.from;reportTo=range.to;render()});
document.addEventListener('click',event=>{if(event.target.closest('[data-gst-export]'))exportGstAnnualReport();else if(event.target.closest('[data-gst-print]'))printGstAnnualReport()});
const gstAnnualStyle=document.createElement('style');gstAnnualStyle.textContent='.gstReportControls .panelbody{display:flex;align-items:center;gap:14px;flex-wrap:wrap}.gstReportControls label{display:flex;align-items:center;gap:8px;font-weight:700}.gstReportControls select{min-width:270px}.gstReportCaveat{margin:10px 0 16px}.gstReportNotice ul{padding-left:22px;line-height:1.55}.gstReportNotice p{margin:4px 0 10px}#content:has(.gstReportControls)>.cards{margin-bottom:12px}';document.head.appendChild(gstAnnualStyle);
if(location.hash.slice(1)==='report-gst')page='report-gst';
if(page==='report-gst'){const initialRange=gstFyRange(gstSelectedFy);reportFrom=initialRange.from;reportTo=initialRange.to}
const gstReportPageWithHint=reportPage;
reportPage=function(){if(page!=='report-gst')return gstReportPageWithHint.apply(this,arguments);return gstReportPageWithHint.apply(this,arguments)+'<p class="gstCalculationHint">Calculation hint: Outward taxable value comes from job cards and counter sales after line discounts, excluding GST. Supplier purchase value is before GST. GST is calculated per saved line rate; Non-GST invoices use 0% GST. The report is a reconciliation workpaper and supplier GST must be checked against invoices and portal records.</p>'};
gstAnnualStyle.textContent+=' .gstCalculationHint{margin:12px 0 0;padding:7px 10px;color:#64748b;font-size:10px;line-height:1.35;border-top:1px solid #e2e8f0}'
render();
