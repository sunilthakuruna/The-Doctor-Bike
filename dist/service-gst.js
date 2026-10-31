/* Per-line Service / Labour GST for Job Cards. */
const serviceGstChoices=()=>[...new Set((db.lists?.['GST Rates']||[0,5,10,12,18,24,28]).map(Number).filter(Number.isFinite))].sort((a,b)=>a-b);

function serviceGstRate(line,b){
  if(line&&Object.prototype.hasOwnProperty.call(line,'gst')&&Number.isFinite(Number(line.gst))){
    return Math.max(0,Math.min(100,Number(line.gst)));
  }
  return Math.max(0,Math.min(100,Number(b?.tax||0)));
}

function ensureServiceGst(line,b=jobDraft?.record){
  if(!line)return 0;
  if(!Object.prototype.hasOwnProperty.call(line,'gst')||!Number.isFinite(Number(line.gst))){
    line.gst=jobDraft?.id?Number(b?.tax||0):Number(db.settings?.defaultSellingGstRate??db.settings?.defaultGstRate??0);
  }
  return serviceGstRate(line,b);
}

function serviceLineNet(line){
  if(typeof itemNet==='function')return Number(itemNet(line,'service'));
  return Math.max(0,Number(line?.charge||0)-Number(line?.discount||0));
}

function serviceGstRates(b){
  return [...new Set((b?.serviceLines||[]).map(line=>serviceGstRate(line,b)))].sort((a,c)=>a-c);
}

function serviceLineAmount(line,b){
  const rate=b?.invoiceType==='non-gst'?0:serviceGstRate(line,b);
  return round(serviceLineNet(line)*(1+rate/100));
}

function serviceTaxAfterDiscounts(b,globalFactor=1){
  if(!b||b.invoiceType==='non-gst')return 0;
  const lines=b.serviceLines||[];
  const itemNetTotal=lines.reduce((sum,line)=>sum+serviceLineNet(line),0);
  const lineTaxBase=lines.reduce((sum,line)=>sum+serviceLineNet(line)*serviceGstRate(line,b)/100,0);
  const d=typeof splitDiscounts==='function'?splitDiscounts(b):{labour:lines.reduce((sum,line)=>sum+Number(line.charge||0),0),service:0};
  const serviceAfterServiceDiscount=Math.max(0,Number(d.labour||0)-Number(d.service||0));
  const itemFactor=itemNetTotal?serviceAfterServiceDiscount/itemNetTotal:0;
  const factor=Number.isFinite(Number(globalFactor))?Number(globalFactor):1;
  return round(lineTaxBase*itemFactor*factor);
}

function setServiceGst(index,value){
  if(!jobDraft||jobDraft.key!=='jobs')return;
  const line=jobDraft.record.serviceLines?.[Number(index)];
  if(!line)return;
  const rate=Number(value);
  const nextRate=Number.isFinite(rate)?Math.max(0,Math.min(100,rate)):0;
  if(line.gst===nextRate&&!(nextRate>0&&jobDraft.record.invoiceType==='non-gst'))return;
  line.gst=nextRate;
  if(line.gst>0&&jobDraft.record.invoiceType==='non-gst'){
    jobDraft.record.invoiceType='gst';
    const invoiceType=document.querySelector('#billForm [name="invoiceType"]');
    if(invoiceType)invoiceType.value='gst';
  }
  updateBillTotals();
  const amountCells=document.querySelectorAll('#serviceLines [data-service-amount]');
  const amountCell=amountCells[Number(index)];
  if(amountCell)amountCell.textContent=money(serviceLineAmount(line,jobDraft.record));
}

(function(){
  const lineBeforeServiceGst=lineRender;

  function refreshServiceGstCells(){
    if(!jobDraft||jobDraft.key!=='jobs')return;
    const table=document.querySelector('#serviceLines table');
    if(!table)return;
    const header=table.tHead?.rows[0]||table.rows[0];
    if(!header)return;
    const amountHead=header.querySelector('[data-service-amount]');
    if(!amountHead)return;
    if(!header.querySelector('[data-service-gst-header]')){
      const th=document.createElement('th');
      th.dataset.serviceGstHeader='1';
      th.textContent='GST (%)';
      header.insertBefore(th,amountHead);
    }
    const nonGst=(document.querySelector('#billForm [name="invoiceType"]')?.value||jobDraft.record.invoiceType)==='non-gst';
    const lines=jobDraft.record.serviceLines||[];
    const rows=table.tBodies?.[0]?.rows||[];
    [...rows].forEach((row,index)=>{
      if(row.classList.contains('empty'))return;
      const line=lines[index];
      if(!line)return;
      const rate=ensureServiceGst(line,jobDraft.record);
      const amount=row.querySelector('[data-service-amount]');
      if(!amount)return;
      let cell=row.querySelector('[data-service-gst-cell]');
      if(!cell){
        cell=document.createElement('td');
        cell.className='serviceGstCell';
        cell.dataset.serviceGstCell='1';
        row.insertBefore(cell,amount);
      }
      cell.classList.toggle('nonGstTax',nonGst);
      cell.innerHTML='<select data-servicefield="'+index+'|gst" aria-label="Service '+(index+1)+' GST">'+serviceGstChoices().map(choice=>'<option value="'+choice+'"'+(choice===rate?' selected':'')+'>'+choice+'%</option>').join('')+'</select>';
      const selector=cell.querySelector('select');
      if(selector){
        selector.value=String(rate);
        selector.onchange=event=>setServiceGst(index,event.target.value);
      }
      amount.textContent=money(serviceLineAmount(line,jobDraft.record));
    });
    const gstHead=header.querySelector('[data-service-gst-header]');
    if(gstHead)gstHead.classList.toggle('nonGstTax',nonGst);
  }

  lineRender=function(){
    const result=lineBeforeServiceGst.apply(this,arguments);
    refreshServiceGstCells();
    return result;
  };

  const updateBeforeServiceGst=updateBillTotals;
  updateBillTotals=function(){
    const result=updateBeforeServiceGst.apply(this,arguments);
    refreshServiceGstCells();
    return result;
  };

  const billTotalsBeforeServiceGst=billTotals;
  billTotals=function(b){
    const result=billTotalsBeforeServiceGst.apply(this,arguments);
    if(!b||b.invoiceType==='non-gst'||!(b.serviceLines||[]).length)return result;
    const d=typeof splitDiscounts==='function'?splitDiscounts(b):{labour:0,service:0,parts:0,part:0};
    const service=Math.max(0,Number(d.labour||0)-Number(d.service||0));
    const parts=Math.max(0,Number(d.parts||0)-Number(d.part||0));
    const after=service+parts;
    const factor=after?Math.max(0,after-Number(b.discount||0))/after:0;
    const oldServiceTax=round(service*Number(b.tax||0)/100*factor);
    const newServiceTax=serviceTaxAfterDiscounts(b,factor);
    const tax=round(Number(result.tax||0)-oldServiceTax+newServiceTax);
    return {...result,tax,total:round(Number(result.total||0)-oldServiceTax+newServiceTax)};
  };

  const receiptRowsBeforeServiceGst=receiptRows;
  receiptRows=function(b){
    const rows=receiptRowsBeforeServiceGst.apply(this,arguments);
    const partCount=(b?.partLines||[]).length;
    return rows.map((row,index)=>{
      if(index<partCount)return row;
      const line=(b?.serviceLines||[])[index-partCount];
      return line?{...row,amount:serviceLineAmount(line,b)}:row;
    });
  };

  document.addEventListener('change',event=>{
    const field=event.target?.dataset?.servicefield;
    if(!field||!jobDraft||jobDraft.key!=='jobs')return;
    const [index,key]=field.split('|');
    if(key==='gst')setServiceGst(index,event.target.value);
  },true);
})();

const saveBeforeServiceLineGst=saveBill;
 saveBill=function(event){if(jobDraft?.key==='jobs'){for(const line of jobDraft.record.serviceLines||[]){const rate=Number(line.gst||0);if(!Number.isFinite(rate)||rate<0||rate>100){event.preventDefault();return toast('Enter a service GST rate from 0 to 100.');}}}return saveBeforeServiceLineGst(event);};

